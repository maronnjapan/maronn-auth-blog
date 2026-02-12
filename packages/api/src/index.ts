import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types/env';
import { AppError } from '@maronn-auth-blog/shared';
import { CleanupOrphanedDataUsecase } from './usecases/batch/cleanup-orphaned-data';
import { RefreshTrendingPageviewsUsecase } from './usecases/batch/refresh-trending-pageviews';
import { ArticleRepository } from './infrastructure/repositories/article-repository';
import { KVClient } from './infrastructure/storage/kv-client';
import { R2Client } from './infrastructure/storage/r2-client';
import { CloudflareAnalyticsClient } from './infrastructure/cloudflare-analytics-client';

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
import bookmarkController from './controllers/bookmark-controller';

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
app.route('/bookmarks', bookmarkController);

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
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.info(`[Scheduled] Cron triggered: ${event.cron}`);

    const kvClient = new KVClient(env.KV);

    // 毎時: トレンド記事のページビューキャッシュを更新
    if (event.cron === '0 * * * *') {
      try {
        if (!env.CF_WEB_ANALYTICS_API_TOKEN || !env.CF_ZONE_ID || !env.WEB_URL) {
          console.error('[RefreshTrendingPageviews] Missing required env vars: CF_WEB_ANALYTICS_API_TOKEN, CF_ZONE_ID, or WEB_URL');
        } else {
          const analyticsClient = new CloudflareAnalyticsClient(env.CF_WEB_ANALYTICS_API_TOKEN, env.CF_ZONE_ID);
          const refreshTrendingUsecase = new RefreshTrendingPageviewsUsecase(analyticsClient, kvClient);
          const webHost = new URL(env.WEB_URL).host;
          console.info(`[RefreshTrendingPageviews] Refreshing for host: ${webHost}`);
          ctx.waitUntil(
            refreshTrendingUsecase.execute(webHost).catch((err) => {
              console.error('[RefreshTrendingPageviews] Scheduled refresh failed:', err);
            })
          );
        }
      } catch (err) {
        console.error('[RefreshTrendingPageviews] Failed to initialize:', err);
      }
    }

    // 日次 (3:00 UTC): 孤立データのクリーンアップ
    if (event.cron === '0 3 * * *') {
      try {
        const articleRepo = new ArticleRepository(env.DB);
        const r2Client = new R2Client(env.R2);
        const orphanedDataUsecase = new CleanupOrphanedDataUsecase(articleRepo, kvClient, r2Client);
        ctx.waitUntil(
          orphanedDataUsecase.execute().catch((err) => {
            console.error('[CleanupOrphanedData] Scheduled cleanup failed:', err);
          })
        );
      } catch (err) {
        console.error('[CleanupOrphanedData] Failed to initialize:', err);
      }
    }

    console.info(`[Scheduled] Cron handler completed: ${event.cron}`);
  },
};
export type AppType = typeof app;
