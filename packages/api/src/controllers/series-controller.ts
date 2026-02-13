import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../types/env';
import { SeriesRepository } from '../infrastructure/repositories/series-repository';
import { ArticleRepository } from '../infrastructure/repositories/article-repository';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { requireAuth } from '../middleware/auth';
import { UnauthorizedError, NotFoundError, ValidationError, ForbiddenError } from '@maronn-auth-blog/shared';

const app = new Hono<{ Bindings: Env }>();

// GET /series - Get all public series
app.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const seriesRepo = new SeriesRepository(c.env.DB);
  const userRepo = new UserRepository(c.env.DB);

  const seriesList = await seriesRepo.findAllPublic(limit, offset);

  const seriesWithDetails = await Promise.all(
    seriesList.map(async (series) => {
      const user = await userRepo.findById(series.userId);
      const articleCount = await seriesRepo.countArticles(series.id);
      return {
        ...series,
        articleCount,
        author: user ? {
          id: user.toJSON().id,
          username: user.toJSON().username,
          displayName: user.toJSON().displayName,
          iconUrl: user.toJSON().iconUrl,
        } : undefined,
      };
    })
  );

  return c.json({ series: seriesWithDetails });
});

// GET /series/article/:articleId - Get series info for a specific article
app.get('/article/:articleId', async (c) => {
  const articleId = c.req.param('articleId');

  const seriesRepo = new SeriesRepository(c.env.DB);
  const articleRepo = new ArticleRepository(c.env.DB);

  const seriesEntries = await seriesRepo.findSeriesByArticleId(articleId);

  const seriesWithArticles = await Promise.all(
    seriesEntries.map(async ({ series, orderIndex }) => {
      const seriesArticles = await seriesRepo.findArticleIds(series.id);

      const articles = await Promise.all(
        seriesArticles.map(async (sa) => {
          const article = await articleRepo.findById(sa.articleId);
          if (!article || !article.publishedAt) return null;

          return {
            id: article.id,
            slug: article.slug.toString(),
            title: article.title,
            orderIndex: sa.orderIndex,
          };
        })
      );

      return {
        ...series,
        orderIndex,
        articles: articles.filter((a) => a !== null),
      };
    })
  );

  return c.json({ series: seriesWithArticles });
});

// GET /series/:username/:slug - Get series detail with articles
app.get('/:username/:slug', async (c) => {
  const username = c.req.param('username');
  const slug = c.req.param('slug');

  const userRepo = new UserRepository(c.env.DB);
  const user = await userRepo.findByUsername(username);
  if (!user) {
    throw new NotFoundError('User', username);
  }

  const seriesRepo = new SeriesRepository(c.env.DB);
  const series = await seriesRepo.findByUserIdAndSlug(user.id, slug);
  if (!series) {
    throw new NotFoundError('Series', slug);
  }

  const articleRepo = new ArticleRepository(c.env.DB);
  const seriesArticles = await seriesRepo.findArticleIds(series.id);

  // Fetch article details
  const articles = await Promise.all(
    seriesArticles.map(async (sa) => {
      const article = await articleRepo.findById(sa.articleId);
      if (!article || !article.publishedAt) return null;

      const topics = await articleRepo.findTopics(article.id);

      return {
        id: article.id,
        slug: article.slug.toString(),
        title: article.title,
        publishedAt: article.publishedAt.toISOString(),
        topics,
        orderIndex: sa.orderIndex,
      };
    })
  );

  const publishedArticles = articles.filter((a) => a !== null);

  return c.json({
    ...series,
    articles: publishedArticles,
    author: {
      id: user.toJSON().id,
      username: user.toJSON().username,
      displayName: user.toJSON().displayName,
      iconUrl: user.toJSON().iconUrl,
    },
  });
});

// POST /series - Create a new series (authenticated)
app.post(
  '/',
  requireAuth(),
  zValidator('json', z.object({
    title: z.string().min(1).max(200),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    description: z.string().max(500).optional(),
  })),
  async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new UnauthorizedError();
    }

    const { title, slug, description } = c.req.valid('json');

    const seriesRepo = new SeriesRepository(c.env.DB);
    const existing = await seriesRepo.findByUserIdAndSlug(auth.userId, slug);
    if (existing) {
      throw new ValidationError('Series with this slug already exists');
    }

    const series = await seriesRepo.create({
      userId: auth.userId,
      title,
      slug,
      description,
    });

    return c.json(series, 201);
  }
);

// PUT /series/:id - Update series (authenticated, owner only)
app.put(
  '/:id',
  requireAuth(),
  zValidator('json', z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional(),
    status: z.enum(['active', 'completed', 'archived']).optional(),
  })),
  async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new UnauthorizedError();
    }

    const seriesId = c.req.param('id');
    const seriesRepo = new SeriesRepository(c.env.DB);
    const series = await seriesRepo.findById(seriesId);
    if (!series) {
      throw new NotFoundError('Series', seriesId);
    }

    if (series.userId !== auth.userId) {
      throw new ForbiddenError('Not the series owner');
    }

    const body = c.req.valid('json');
    await seriesRepo.update(seriesId, body);

    return c.json({ success: true });
  }
);

// DELETE /series/:id - Delete series (authenticated, owner only)
app.delete('/:id', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const seriesId = c.req.param('id');
  const seriesRepo = new SeriesRepository(c.env.DB);
  const series = await seriesRepo.findById(seriesId);
  if (!series) {
    throw new NotFoundError('Series', seriesId);
  }

  if (series.userId !== auth.userId) {
    throw new ForbiddenError('Not the series owner');
  }

  await seriesRepo.delete(seriesId);
  return c.json({ success: true });
});

// POST /series/:id/articles - Add article to series
app.post(
  '/:id/articles',
  requireAuth(),
  zValidator('json', z.object({
    articleId: z.string().uuid(),
    orderIndex: z.number().int().min(0).optional(),
  })),
  async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new UnauthorizedError();
    }

    const seriesId = c.req.param('id');
    const { articleId, orderIndex } = c.req.valid('json');

    const seriesRepo = new SeriesRepository(c.env.DB);
    const series = await seriesRepo.findById(seriesId);
    if (!series) {
      throw new NotFoundError('Series', seriesId);
    }

    if (series.userId !== auth.userId) {
      throw new ForbiddenError('Not the series owner');
    }

    // Verify article exists and belongs to user
    const articleRepo = new ArticleRepository(c.env.DB);
    const article = await articleRepo.findById(articleId);
    if (!article || article.userId !== auth.userId) {
      throw new NotFoundError('Article', articleId);
    }

    const currentCount = await seriesRepo.countArticles(seriesId);
    const order = orderIndex ?? currentCount;

    await seriesRepo.addArticle(seriesId, articleId, order);
    return c.json({ success: true }, 201);
  }
);

// DELETE /series/:id/articles/:articleId - Remove article from series
app.delete('/:id/articles/:articleId', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const seriesId = c.req.param('id');
  const articleId = c.req.param('articleId');

  const seriesRepo = new SeriesRepository(c.env.DB);
  const series = await seriesRepo.findById(seriesId);
  if (!series) {
    throw new NotFoundError('Series', seriesId);
  }

  if (series.userId !== auth.userId) {
    throw new ForbiddenError('Not the series owner');
  }

  await seriesRepo.removeArticle(seriesId, articleId);
  return c.json({ success: true });
});

// PUT /series/:id/articles/order - Reorder articles in series
app.put(
  '/:id/articles/order',
  requireAuth(),
  zValidator('json', z.object({
    articles: z.array(z.object({
      articleId: z.string().uuid(),
      orderIndex: z.number().int().min(0),
    })),
  })),
  async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new UnauthorizedError();
    }

    const seriesId = c.req.param('id');
    const { articles } = c.req.valid('json');

    const seriesRepo = new SeriesRepository(c.env.DB);
    const series = await seriesRepo.findById(seriesId);
    if (!series) {
      throw new NotFoundError('Series', seriesId);
    }

    if (series.userId !== auth.userId) {
      throw new ForbiddenError('Not the series owner');
    }

    for (const item of articles) {
      await seriesRepo.updateArticleOrder(seriesId, item.articleId, item.orderIndex);
    }

    return c.json({ success: true });
  }
);

export default app;
