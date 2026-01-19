import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../types/env';
import { ArticleRepository } from '../infrastructure/repositories/article-repository';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { RepositoryRepository } from '../infrastructure/repositories/repository-repository';
import { NotificationRepository } from '../infrastructure/repositories/notification-repository';
import { GitHubClient } from '../infrastructure/github-client';
import { KVClient } from '../infrastructure/storage/kv-client';
import { R2Client } from '../infrastructure/storage/r2-client';
import { ApproveArticleUsecase } from '../usecases/article/approve-article';
import { RejectArticleUsecase } from '../usecases/article/reject-article';
import { requireAuth } from '../middleware/auth';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@maronn-auth-blog/shared';

const app = new Hono<{ Bindings: Env }>();

// Admin-only middleware
async function adminOnly(c: any, next: any) {
  await requireAuth()(c, async () => {});

  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const hasAdminPermission = auth.permissions?.includes('admin:users');

  if (!hasAdminPermission) {
    throw new ForbiddenError('Admin access required');
  }

  await next();
}

// GET /admin/reviews - Get pending review articles
app.get('/reviews', adminOnly, async (c) => {
  const articleRepo = new ArticleRepository(c.env.DB);
  const articles = await articleRepo.findPendingReview();

  // Get tags for each article
  const articlesWithTags = await Promise.all(
    articles.map(async (article) => {
      const tags = await articleRepo.findTags(article.id);
      const userRepo = new UserRepository(c.env.DB);
      const user = await userRepo.findById(article.userId);

      return {
        ...article.toJSON(),
        tags,
        author: user?.toJSON(),
      };
    })
  );

  return c.json({ articles: articlesWithTags });
});

// GET /admin/reviews/:id - Get article for review (with preview)
app.get('/reviews/:id', adminOnly, async (c) => {
  const articleId = c.req.param('id');
  const articleRepo = new ArticleRepository(c.env.DB);
  const article = await articleRepo.findById(articleId);

  if (!article) {
    throw new NotFoundError('Article', articleId);
  }

  const userRepo = new UserRepository(c.env.DB);
  const user = await userRepo.findById(article.userId);

  if (!user) {
    throw new NotFoundError('User', article.userId);
  }

  const tags = await articleRepo.findTags(article.id);

  // Get repository
  const repoRepo = new RepositoryRepository(c.env.DB);
  const repo = await repoRepo.findByUserId(user.id);

  // Generate preview by fetching and parsing markdown
  let html = '';
  if (repo && user.githubInstallationId) {
    try {
      const [owner, repoName] = repo.github_repo_full_name.split('/');
      const githubClient = new GitHubClient(c.env.GITHUB_APP_ID, c.env.GITHUB_APP_PRIVATE_KEY);

      const { content: markdown } = await githubClient.fetchFile(
        user.githubInstallationId,
        owner,
        repoName,
        article.githubPath
      );

      const { parseArticle } = await import('../utils/markdown-parser');
      const parsed = parseArticle(markdown, c.env.EMBED_ORIGIN);
      html = parsed.html;
    } catch (error) {
      console.error('[AdminController] Failed to generate preview:', error);
      html = '<p>プレビューの生成に失敗しました</p>';
    }
  }

  return c.json({
    article: article.toJSON(),
    html,
    tags,
    author: user.toJSON(),
    repository: repo,
  });
});

// POST /admin/reviews/:id/approve - Approve article
app.post('/reviews/:id/approve', adminOnly, async (c) => {
  const articleId = c.req.param('id');

  const articleRepo = new ArticleRepository(c.env.DB);
  const userRepo = new UserRepository(c.env.DB);
  const repoRepo = new RepositoryRepository(c.env.DB);
  const notificationRepo = new NotificationRepository(c.env.DB);
  const githubClient = new GitHubClient(c.env.GITHUB_APP_ID, c.env.GITHUB_APP_PRIVATE_KEY);
  const kvClient = new KVClient(c.env.KV);
  const r2Client = new R2Client(c.env.R2);

  const usecase = new ApproveArticleUsecase(
    articleRepo,
    userRepo,
    repoRepo,
    notificationRepo,
    githubClient,
    kvClient,
    r2Client,
    c.env.EMBED_ORIGIN,
    c.env.IMAGE_URL
  );

  await usecase.execute(articleId);

  return c.json({ success: true });
});

// POST /admin/reviews/:id/reject - Reject article
app.post(
  '/reviews/:id/reject',
  adminOnly,
  zValidator('json', z.object({ reason: z.string().min(1) })),
  async (c) => {
    const articleId = c.req.param('id');
    const { reason } = c.req.valid('json');

    const articleRepo = new ArticleRepository(c.env.DB);
    const notificationRepo = new NotificationRepository(c.env.DB);
    const usecase = new RejectArticleUsecase(articleRepo, notificationRepo);

    await usecase.execute(articleId, reason);

    return c.json({ success: true });
  }
);

export default app;
