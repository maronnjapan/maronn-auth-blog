import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../types/env';
import { ArticleRepository } from '../infrastructure/repositories/article-repository';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { KVClient } from '../infrastructure/storage/kv-client';
import { requireAuth } from '../middleware/auth';
import { NotFoundError, ForbiddenError, UnauthorizedError } from '@maronn-auth-blog/shared';
import { SearchArticlesUsecase } from '../usecases/article/search-articles';
import { GetArticlesByCategoryUsecase } from '../usecases/article/get-articles-by-category';
import { GetArticlesByTagUsecase } from '../usecases/article/get-articles-by-tag';
import { GetCategoriesUsecase } from '../usecases/article/get-categories';
import { GetTagsUsecase } from '../usecases/article/get-tags';
import type { Article as ArticleEntity } from '../domain/entities/article';

const app = new Hono<{ Bindings: Env }>();

// GET /articles - Get published articles feed with optional filtering
app.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const category = c.req.query('category');
  const tag = c.req.query('tag');

  const articleRepo = new ArticleRepository(c.env.DB);
  const userRepo = new UserRepository(c.env.DB);

  let articles;
  let total;

  if (category) {
    // Filter by category
    const usecase = new GetArticlesByCategoryUsecase(articleRepo);
    const result = await usecase.execute({ category, page, limit });
    articles = result.items;
    total = result.total;
  } else if (tag) {
    // Filter by tag
    const usecase = new GetArticlesByTagUsecase(articleRepo);
    const result = await usecase.execute({ tag, page, limit });
    articles = result.items;
    total = result.total;
  } else {
    // Default: all published
    articles = await articleRepo.findPublished(limit, offset);
    total = await articleRepo.countPublished();
  }

  // Get tags for each article
  const articlesWithTags = await buildArticleListResponse(articleRepo, userRepo, articles);

  return c.json({
    articles: articlesWithTags,
    total,
    page,
    limit,
    hasMore: offset + articles.length < total,
  });
});

// GET /articles/search - Search articles by title
app.get(
  '/search',
  zValidator('query', z.object({
    q: z.string().min(1),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })),
  async (c) => {
    const { q, page, limit } = c.req.valid('query');

    const articleRepo = new ArticleRepository(c.env.DB);
    const usecase = new SearchArticlesUsecase(articleRepo);
    const result = await usecase.execute({ query: q, page, limit });
    const userRepo = new UserRepository(c.env.DB);
    const articlesWithTags = await buildArticleListResponse(
      articleRepo,
      userRepo,
      result.items
    );

    return c.json({
      articles: articlesWithTags,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
      query: q,
    });
  }
);

// GET /articles/categories - Get all categories with counts
app.get('/categories', async (c) => {
  const articleRepo = new ArticleRepository(c.env.DB);
  const usecase = new GetCategoriesUsecase(articleRepo);
  const categories = await usecase.execute();

  return c.json({ categories });
});

// GET /articles/tags - Get all tags with counts
app.get('/tags', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');

  const articleRepo = new ArticleRepository(c.env.DB);
  const usecase = new GetTagsUsecase(articleRepo);
  const tags = await usecase.execute(limit);

  return c.json({ tags });
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
  const articlesWithTags = await buildArticleListResponse(articleRepo, userRepo, articles);

  return c.json({
    articles: articlesWithTags,
    user: user.toJSON(),
  });
});

export default app;

type ArticleAuthor = {
  id: string;
  username: string;
  displayName: string;
  iconUrl?: string;
};

async function buildArticleListResponse(
  articleRepo: ArticleRepository,
  userRepo: UserRepository,
  articles: ArticleEntity[]
) {
  const authorCache = new Map<string, ArticleAuthor>();

  const getAuthor = async (userId: string): Promise<ArticleAuthor | undefined> => {
    if (authorCache.has(userId)) {
      return authorCache.get(userId);
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      return undefined;
    }

    const data = user.toJSON();
    const author: ArticleAuthor = {
      id: data.id,
      username: data.username,
      displayName: data.displayName,
      iconUrl: data.iconUrl,
    };
    authorCache.set(userId, author);
    return author;
  };

  return Promise.all(
    articles.map(async (article) => {
      const tags = await articleRepo.findTags(article.id);
      const author = await getAuthor(article.userId);

      return {
        ...article.toJSON(),
        tags,
        author,
      };
    })
  );
}
