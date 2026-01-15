import { Hono } from 'hono';
import type { Env } from '../types/env';
import { ArticleRepository } from '../infrastructure/repositories/article-repository';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { KVClient } from '../infrastructure/storage/kv-client';
import { requireAuth } from '../middleware/auth';
import { NotFoundError, ForbiddenError, UnauthorizedError } from '@maronn-auth-blog/shared';

const app = new Hono<{ Bindings: Env }>();

// GET /articles - Get published articles feed
app.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const articleRepo = new ArticleRepository(c.env.DB);
  const articles = await articleRepo.findPublished(limit, offset);

  // Get tags for each article
  const articlesWithTags = await Promise.all(
    articles.map(async (article) => {
      const tags = await articleRepo.findTags(article.id);
      return {
        ...article.toJSON(),
        tags,
      };
    })
  );

  return c.json({
    articles: articlesWithTags,
    page,
    limit,
  });
});

// GET /articles/:username/:slug - Get article detail
app.get('/:username/:slug', async (c) => {
  const username = c.req.param('username');
  const slug = c.req.param('slug');

  const userRepo = new UserRepository(c.env.DB);
  const user = await userRepo.findByUsername(username);

  if (!user) {
    throw new NotFoundError('User', username);
  }

  const articleRepo = new ArticleRepository(c.env.DB);
  const article = await articleRepo.findByUserIdAndSlug(user.id, slug);

  if (!article) {
    throw new NotFoundError('Article', slug);
  }

  // Only show published articles to non-owners
  const auth = c.get('auth');
  if (article.status.toString() !== 'published' && (!auth || auth.userId !== user.id)) {
    throw new NotFoundError('Article', slug);
  }

  // Get cached HTML
  const kvClient = new KVClient(c.env.KV);
  const html = await kvClient.getArticleHtml(user.id, slug);

  // Get tags
  const tags = await articleRepo.findTags(article.id);

  return c.json({
    ...article.toJSON(),
    html,
    tags,
    author: user.toJSON(),
  });
});

// GET /users/:username/articles - Get user's published articles
app.get('/users/:username/articles', async (c) => {
  const username = c.req.param('username');

  const userRepo = new UserRepository(c.env.DB);
  const user = await userRepo.findByUsername(username);

  if (!user) {
    throw new NotFoundError('User', username);
  }

  const articleRepo = new ArticleRepository(c.env.DB);
  const articles = await articleRepo.findPublishedByUserId(user.id);

  // Get tags for each article
  const articlesWithTags = await Promise.all(
    articles.map(async (article) => {
      const tags = await articleRepo.findTags(article.id);
      return {
        ...article.toJSON(),
        tags,
      };
    })
  );

  return c.json({
    articles: articlesWithTags,
    user: user.toJSON(),
  });
});

// DELETE /articles/:id - Delete article (owner only)
app.delete('/:id', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const articleId = c.req.param('id');
  const articleRepo = new ArticleRepository(c.env.DB);
  const article = await articleRepo.findById(articleId);

  if (!article) {
    throw new NotFoundError('Article', articleId);
  }

  if (article.userId !== auth.userId) {
    throw new ForbiddenError('You do not own this article');
  }

  // Mark as deleted
  article.delete();
  await articleRepo.save(article);

  // Delete cached HTML
  const kvClient = new KVClient(c.env.KV);
  await kvClient.deleteArticleHtml(article.userId, article.slug.toString());

  return c.json({ success: true });
});

export default app;
