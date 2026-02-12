import { Hono } from 'hono';
import type { Env } from '../types/env';
import { BookmarkRepository } from '../infrastructure/repositories/bookmark-repository';
import { ArticleRepository } from '../infrastructure/repositories/article-repository';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { requireAuth } from '../middleware/auth';
import { UnauthorizedError, NotFoundError } from '@maronn-auth-blog/shared';

const app = new Hono<{ Bindings: Env }>();

// POST /bookmarks/:articleId - Add bookmark
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

  const bookmarkRepo = new BookmarkRepository(c.env.DB);
  const exists = await bookmarkRepo.exists(auth.userId, articleId);
  if (exists) {
    return c.json({ success: true, message: 'Already bookmarked' });
  }

  await bookmarkRepo.add(auth.userId, articleId);
  return c.json({ success: true }, 201);
});

// DELETE /bookmarks/:articleId - Remove bookmark
app.delete('/:articleId', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const articleId = c.req.param('articleId');
  const bookmarkRepo = new BookmarkRepository(c.env.DB);
  await bookmarkRepo.remove(auth.userId, articleId);

  return c.json({ success: true });
});

// GET /bookmarks/:articleId/status - Check if article is bookmarked
app.get('/:articleId/status', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const articleId = c.req.param('articleId');
  const bookmarkRepo = new BookmarkRepository(c.env.DB);
  const bookmarked = await bookmarkRepo.exists(auth.userId, articleId);
  const count = await bookmarkRepo.countByArticleId(articleId);

  return c.json({ bookmarked, count });
});

// GET /bookmarks - Get current user's bookmarked articles
app.get('/', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const bookmarkRepo = new BookmarkRepository(c.env.DB);
  const articleRepo = new ArticleRepository(c.env.DB);
  const userRepo = new UserRepository(c.env.DB);

  const [bookmarks, total] = await Promise.all([
    bookmarkRepo.findByUserId(auth.userId, limit, offset),
    bookmarkRepo.countByUserId(auth.userId),
  ]);

  // Fetch article details for each bookmark
  const articles = await Promise.all(
    bookmarks.map(async (bookmark) => {
      const article = await articleRepo.findById(bookmark.articleId);
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
        bookmarkedAt: bookmark.createdAt,
      };
    })
  );

  const filteredArticles = articles.filter((a) => a !== null);

  return c.json({
    articles: filteredArticles,
    total,
    page,
    limit,
    hasMore: offset + bookmarks.length < total,
  });
});

export default app;
