import { Hono } from 'hono';
import type { Env } from '../types/env';
import { LikeRepository } from '../infrastructure/repositories/like-repository';
import { ArticleRepository } from '../infrastructure/repositories/article-repository';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { requireAuth } from '../middleware/auth';
import { UnauthorizedError, NotFoundError } from '@maronn-auth-blog/shared';

const app = new Hono<{ Bindings: Env }>();

// POST /likes/:articleId - Add like
app.post('/:articleId', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const articleId = c.req.param('articleId');

  const articleRepo = new ArticleRepository(c.env.DB);
  const article = await articleRepo.findById(articleId);
  if (!article) {
    throw new NotFoundError('Article', articleId);
  }

  const likeRepo = new LikeRepository(c.env.DB);
  const exists = await likeRepo.exists(auth.userId, articleId);
  if (exists) {
    return c.json({ success: true, message: 'Already liked' });
  }

  await likeRepo.add(auth.userId, articleId);
  return c.json({ success: true }, 201);
});

// DELETE /likes/:articleId - Remove like
app.delete('/:articleId', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const articleId = c.req.param('articleId');
  const likeRepo = new LikeRepository(c.env.DB);
  await likeRepo.remove(auth.userId, articleId);

  return c.json({ success: true });
});

// GET /likes/:articleId/status - Check if article is liked and get count
app.get('/:articleId/status', async (c) => {
  const articleId = c.req.param('articleId');
  const likeRepo = new LikeRepository(c.env.DB);

  const count = await likeRepo.countByArticleId(articleId);

  // Check if current user has liked (if authenticated)
  let liked = false;
  try {
    const cookie = c.req.header('Cookie') || '';
    if (cookie.includes('session=')) {
      // Try to get auth context without throwing
      const { getCookie } = await import('hono/cookie');
      const { decryptSessionId } = await import('../middleware/auth');
      const { KVClient } = await import('../infrastructure/storage/kv-client');

      const token = getCookie(c, 'session');
      if (token) {
        const sessionId = await decryptSessionId(token, c.env.SESSION_SECRET);
        if (sessionId) {
          const kvClient = new KVClient(c.env.KV);
          const session = await kvClient.getSession(sessionId);
          if (session) {
            liked = await likeRepo.exists(session.userId, articleId);
          }
        }
      }
    }
  } catch {
    // Not authenticated, liked stays false
  }

  return c.json({ liked, count });
});

// GET /likes - Get current user's liked articles
app.get('/', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const likeRepo = new LikeRepository(c.env.DB);
  const articleRepo = new ArticleRepository(c.env.DB);
  const userRepo = new UserRepository(c.env.DB);

  const [likes, total] = await Promise.all([
    likeRepo.findByUserId(auth.userId, limit, offset),
    likeRepo.countByUserId(auth.userId),
  ]);

  const articles = await Promise.all(
    likes.map(async (like) => {
      const article = await articleRepo.findById(like.articleId);
      if (!article) return null;

      const topics = await articleRepo.findTopics(article.id);
      const user = await userRepo.findById(article.userId);

      return {
        ...article.toJSON(),
        topics,
        author: user ? {
          id: user.toJSON().id,
          username: user.toJSON().username,
          displayName: user.toJSON().displayName,
          iconUrl: user.toJSON().iconUrl,
        } : undefined,
        likedAt: like.createdAt,
      };
    })
  );

  const filteredArticles = articles.filter((a) => a !== null);

  return c.json({
    articles: filteredArticles,
    total,
    page,
    limit,
    hasMore: offset + likes.length < total,
  });
});

export default app;
