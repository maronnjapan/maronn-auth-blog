import { Hono } from 'hono';
import type { Env } from '../types/env';
import { ArticleRepository } from '../infrastructure/repositories/article-repository';
import { requireAuth } from '../middleware/auth';
import { UnauthorizedError } from '@maronn-auth-blog/shared';

const app = new Hono<{ Bindings: Env }>();

// GET /dashboard/articles - Get current user's articles (all statuses)
app.get('/articles', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const articleRepo = new ArticleRepository(c.env.DB);
  const articles = await articleRepo.findByUserId(auth.userId);

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

  return c.json({ articles: articlesWithTags });
});

// GET /dashboard/notifications - Get notifications (placeholder)
app.get('/notifications', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  // TODO: Implement notifications
  return c.json({ notifications: [] });
});

export default app;
