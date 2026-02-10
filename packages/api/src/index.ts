import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types/env';
import { AppError } from '@maronn-auth-blog/shared';
import { CleanupOrphanedDataUsecase } from './usecases/batch/cleanup-orphaned-data';
import { CleanupStaleSessionsUsecase } from './usecases/batch/cleanup-stale-sessions';
import { ArticleRepository } from './infrastructure/repositories/article-repository';
import { KVClient } from './infrastructure/storage/kv-client';
import { R2Client } from './infrastructure/storage/r2-client';

// Import controllers
import authController from './controllers/auth-controller';
import userController from './controllers/user-controller';
import articleController from './controllers/article-controller';
import dashboardController from './controllers/dashboard-controller';
import adminController from './controllers/admin-controller';
import imageController from './controllers/image-controller';
import webhookController from './controllers/webhook-controller';
import avatarController from './controllers/avatar-controller';
import commentController from './controllers/comment-controller';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => origin,
  credentials: true,
}));

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Routes
app.route('/auth', authController);
app.route('/users', userController);
app.route('/articles', articleController);
app.route('/dashboard', dashboardController);
app.route('/admin', adminController);
app.route('/images', imageController);
app.route('/webhook', webhookController);
app.route('/avatars', avatarController);
app.route('/comments', commentController);

// Error handling
app.onError((err, c) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return c.json(err.toJSON(), err.statusCode as 400 | 401 | 403 | 404 | 500);
  }

  return c.json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  }, 404);
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const articleRepo = new ArticleRepository(env.DB);
    const kvClient = new KVClient(env.KV);
    const r2Client = new R2Client(env.R2);

    const orphanedDataUsecase = new CleanupOrphanedDataUsecase(articleRepo, kvClient, r2Client);
    ctx.waitUntil(
      orphanedDataUsecase.execute().catch((err) => {
        console.error('[CleanupOrphanedData] Scheduled cleanup failed:', err);
      })
    );

    const staleSessionsUsecase = new CleanupStaleSessionsUsecase(kvClient);
    ctx.waitUntil(
      staleSessionsUsecase.execute().catch((err) => {
        console.error('[CleanupStaleSessions] Scheduled cleanup failed:', err);
      })
    );
  },
};
export type AppType = typeof app;
