import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types/env';
import { ArticleRepository } from '../infrastructure/repositories/article-repository';
import { NotificationRepository } from '../infrastructure/repositories/notification-repository';
import { KVClient } from '../infrastructure/storage/kv-client';
import { R2Client } from '../infrastructure/storage/r2-client';
import { requireAuth } from '../middleware/auth';
import { UnauthorizedError, paginationQuerySchema } from '@maronn-auth-blog/shared';
import { GetNotificationsUsecase } from '../usecases/notification/get-notifications';
import { MarkNotificationReadUsecase, MarkAllNotificationsReadUsecase } from '../usecases/notification/mark-notification-read';
import { GetUnreadCountUsecase } from '../usecases/notification/get-unread-count';
import { DeleteArticleUsecase } from '../usecases/article/delete-article';

const app = new Hono<{ Bindings: Env }>();

// GET /dashboard/articles - Get current user's articles (all statuses)
app.get('/articles', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const articleRepo = new ArticleRepository(c.env.DB);
  const articles = await articleRepo.findByUserId(auth.userId);

  // Get topics for each article
  const articlesWithTopics = await Promise.all(
    articles.map(async (article) => {
      const topics = await articleRepo.findTopics(article.id);
      return {
        ...article.toJSON(),
        topics,
      };
    })
  );

  return c.json({ articles: articlesWithTopics });
});

// DELETE /dashboard/articles/:id - Delete an article
app.delete('/articles/:id', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const articleId = c.req.param('id');
  const articleRepo = new ArticleRepository(c.env.DB);
  const kvClient = new KVClient(c.env.KV);
  const r2Client = new R2Client(c.env.R2);

  const usecase = new DeleteArticleUsecase(articleRepo, kvClient, r2Client);
  await usecase.execute({ articleId, userId: auth.userId });

  return c.json({ success: true });
});

// GET /dashboard/notifications - Get notifications (paginated)
app.get(
  '/notifications',
  requireAuth(),
  zValidator('query', paginationQuerySchema),
  async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new UnauthorizedError();
    }

    const { page, limit } = c.req.valid('query');
    const notificationRepo = new NotificationRepository(c.env.DB);
    const usecase = new GetNotificationsUsecase(notificationRepo);

    const result = await usecase.execute({
      userId: auth.userId,
      page,
      limit,
    });

    return c.json({
      notifications: result.items.map((n) => n.toJSON()),
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    });
  }
);

// GET /dashboard/notifications/unread-count - Get unread notification count
app.get('/notifications/unread-count', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const notificationRepo = new NotificationRepository(c.env.DB);
  const usecase = new GetUnreadCountUsecase(notificationRepo);
  const count = await usecase.execute(auth.userId);

  return c.json({ count });
});

// POST /dashboard/notifications/:id/read - Mark notification as read
app.post('/notifications/:id/read', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const notificationId = c.req.param('id');
  const notificationRepo = new NotificationRepository(c.env.DB);
  const usecase = new MarkNotificationReadUsecase(notificationRepo);

  await usecase.execute(notificationId, auth.userId);

  return c.json({ success: true });
});

// POST /dashboard/notifications/read-all - Mark all notifications as read
app.post('/notifications/read-all', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const notificationRepo = new NotificationRepository(c.env.DB);
  const usecase = new MarkAllNotificationsReadUsecase(notificationRepo);

  await usecase.execute(auth.userId);

  return c.json({ success: true });
});

export default app;
