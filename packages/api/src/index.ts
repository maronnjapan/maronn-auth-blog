import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types/env';
import { AppError } from '@maronn-auth-blog/shared';

// Import controllers
import authController from './controllers/auth-controller';
import userController from './controllers/user-controller';
import articleController from './controllers/article-controller';
import dashboardController from './controllers/dashboard-controller';
import adminController from './controllers/admin-controller';
import imageController from './controllers/image-controller';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => origin,
  credentials: true,
}));

// Health check
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

// Error handling
app.onError((err, c) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return c.json(err.toJSON(), err.statusCode);
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

export default app;
