import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../types/env';
import { ArticleRepository } from '../infrastructure/repositories/article-repository';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { RepositoryRepository } from '../infrastructure/repositories/repository-repository';
import { NotificationRepository } from '../infrastructure/repositories/notification-repository';
import { FollowRepository } from '../infrastructure/repositories/follow-repository';
import { NotificationSettingsRepository } from '../infrastructure/repositories/notification-settings-repository';
import { GitHubClient } from '../infrastructure/github-client';
import { KVClient } from '../infrastructure/storage/kv-client';
import { R2Client } from '../infrastructure/storage/r2-client';
import { ResendClient } from '../infrastructure/resend-client';
import { Auth0UserInfoClient } from '../infrastructure/auth0-userinfo-client';
import { ApproveArticleUsecase } from '../usecases/article/approve-article';
import { RejectArticleUsecase } from '../usecases/article/reject-article';
import { requireAuth } from '../middleware/auth';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@maronn-auth-blog/shared';

const app = new Hono<{ Bindings: Env }>();

// Admin-only middleware
async function adminOnly(c: any, next: any) {
  await requireAuth()(c, async () => { });

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

  // Get topics for each article
  const articlesWithTopics = await Promise.all(
    articles.map(async (article) => {
      const topics = await articleRepo.findTopics(article.id);
      const userRepo = new UserRepository(c.env.DB);
      const user = await userRepo.findById(article.userId);

      return {
        ...article.toJSON(),
        topics,
        author: user?.toJSON(),
      };
    })
  );

  return c.json({ articles: articlesWithTopics });
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

  const topics = await articleRepo.findTopics(article.id);

  // Get repository
  const repoRepo = new RepositoryRepository(c.env.DB);
  const repo = await repoRepo.findByUserId(user.id);

  // Fetch markdown for review (without converting to HTML)
  let markdown = '';
  if (repo) {
    try {
      const [owner, repoName] = repo.github_repo_full_name.split('/');
      const githubClient = new GitHubClient(c.env.GITHUB_APP_ID, c.env.GITHUB_APP_PRIVATE_KEY);

      const installationId = await githubClient.getInstallationIdForRepo(owner, repoName);

      if (user.githubInstallationId !== installationId) {
        user.setGitHubInstallation(installationId);
        await userRepo.save(user);
      }

      const { content: markdownContent } = await githubClient.fetchFile(
        installationId,
        owner,
        repoName,
        article.githubPath
      );

      markdown = markdownContent;
    } catch (error) {
      console.error('[AdminController] Failed to fetch markdown:', error);
      markdown = 'マークダウンの取得に失敗しました';
    }
  }

  return c.json({
    article: article.toJSON(),
    markdown,
    topics,
    author: user.toJSON(),
    repository: repo,
  });
});

// POST /admin/reviews/:id/approve - Approve article
app.post(
  '/reviews/:id/approve',
  adminOnly,
  zValidator('json', z.object({ summary: z.string().min(1).max(500) })),
  async (c) => {
    const articleId = c.req.param('id');
    const { summary } = c.req.valid('json');

    const articleRepo = new ArticleRepository(c.env.DB);
    const userRepo = new UserRepository(c.env.DB);
    const repoRepo = new RepositoryRepository(c.env.DB);
    const notificationRepo = new NotificationRepository(c.env.DB);
    const followRepo = new FollowRepository(c.env.DB);
    const notificationSettingsRepo = new NotificationSettingsRepository(c.env.DB);
    const githubClient = new GitHubClient(c.env.GITHUB_APP_ID, c.env.GITHUB_APP_PRIVATE_KEY);
    const kvClient = new KVClient(c.env.KV);
    const r2Client = new R2Client(c.env.R2);
    const resendClient = new ResendClient(c.env.RESEND_API_KEY, c.env.NOTIFICATION_EMAIL_FROM);
    const auth0UserInfoClient = new Auth0UserInfoClient(
      c.env.AUTH0_DOMAIN,
      c.env.AUTH0_M2M_CLIENT_ID,
      c.env.AUTH0_M2M_CLIENT_SECRET
    );

    const usecase = new ApproveArticleUsecase(
      articleRepo,
      userRepo,
      repoRepo,
      notificationRepo,
      followRepo,
      notificationSettingsRepo,
      githubClient,
      kvClient,
      r2Client,
      resendClient,
      auth0UserInfoClient,
      c.env.EMBED_ORIGIN,
      c.env.WEB_URL,
    );

    await usecase.execute(articleId, summary);

    return c.json({ success: true });
  }
);

// POST /admin/reviews/:id/reject - Reject article
app.post(
  '/reviews/:id/reject',
  adminOnly,
  zValidator('json', z.object({ reason: z.string().min(1) })),
  async (c) => {
    const articleId = c.req.param('id');
    const { reason } = c.req.valid('json');

    const articleRepo = new ArticleRepository(c.env.DB);
    const userRepo = new UserRepository(c.env.DB);
    const notificationRepo = new NotificationRepository(c.env.DB);
    const resendClient = new ResendClient(c.env.RESEND_API_KEY, c.env.NOTIFICATION_EMAIL_FROM);
    const auth0UserInfoClient = new Auth0UserInfoClient(
      c.env.AUTH0_DOMAIN,
      c.env.AUTH0_M2M_CLIENT_ID,
      c.env.AUTH0_M2M_CLIENT_SECRET
    );

    const usecase = new RejectArticleUsecase(
      articleRepo,
      userRepo,
      notificationRepo,
      resendClient,
      auth0UserInfoClient,
      c.env.WEB_URL
    );

    await usecase.execute(articleId, reason);

    return c.json({ success: true });
  }
);

export default app;
