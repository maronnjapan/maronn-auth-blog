import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../types/env';
import { ArticleRepository } from '../infrastructure/repositories/article-repository';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { KVClient } from '../infrastructure/storage/kv-client';
import { NotFoundError } from '@maronn-auth-blog/shared';
import { SearchArticlesUsecase } from '../usecases/article/search-articles';
import { GetArticlesByCategoryUsecase } from '../usecases/article/get-articles-by-category';
import { GetArticlesByTopicUsecase } from '../usecases/article/get-articles-by-topic';
import { GetCategoriesUsecase } from '../usecases/article/get-categories';
import { GetTopicsUsecase } from '../usecases/article/get-topics';
import type { Article as ArticleEntity } from '../domain/entities/article';
import { parseArticle, convertImagePaths } from '../utils/markdown-parser';

const app = new Hono<{ Bindings: Env }>();

// GET /articles - Get published articles feed with optional filtering
app.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const category = c.req.query('category');
  const topic = c.req.query('topic');

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
  } else if (topic) {
    // Filter by topic
    const usecase = new GetArticlesByTopicUsecase(articleRepo);
    const result = await usecase.execute({ topic, page, limit });
    articles = result.items;
    total = result.total;
  } else {
    // Default: all published
    articles = await articleRepo.findPublished(limit, offset);
    total = await articleRepo.countPublished();
  }

  // Get topics for each article
  const articlesWithTopics = await buildArticleListResponse(
    articleRepo,
    userRepo,
    articles,
    'public'
  );

  return c.json({
    articles: articlesWithTopics,
    total,
    page,
    limit,
    hasMore: offset + articles.length < total,
  });
});

// GET /articles/search - Search articles by title or topics (with #hashtag)
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

    // ハッシュタグ検索の場合
    if (result.isHashtagSearch) {
      const topicArticlesWithTopics = await buildArticleListResponse(
        articleRepo,
        userRepo,
        result.topicResults,
        'public'
      );

      const articles = topicArticlesWithTopics.map((a) => ({
        ...a,
        matchType: 'topic' as const,
      }));

      return c.json({
        articles,
        andTotal: 0,
        orTotal: 0,
        topicTotal: result.topicTotal,
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
        query: q,
        normalizedTokens: result.normalizedTokens,
        isMultiToken: result.isMultiToken,
        isHashtagSearch: true,
        searchedTopics: result.searchedTopics,
      });
    }

    // AND結果とOR結果を別々にビルド
    const [andArticlesWithTopics, orArticlesWithTopics] = await Promise.all([
      buildArticleListResponse(articleRepo, userRepo, result.andResults, 'public'),
      buildArticleListResponse(articleRepo, userRepo, result.orResults, 'public'),
    ]);

    // matchTypeを付与
    const andArticles = andArticlesWithTopics.map((a) => ({
      ...a,
      matchType: 'and' as const,
    }));
    const orArticles = orArticlesWithTopics.map((a) => ({
      ...a,
      matchType: 'or' as const,
    }));

    // AND結果を先に、OR結果を後に結合
    const articles = [...andArticles, ...orArticles];

    return c.json({
      articles,
      andTotal: result.andTotal,
      orTotal: result.orTotal,
      topicTotal: 0,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
      query: q,
      normalizedTokens: result.normalizedTokens,
      isMultiToken: result.isMultiToken,
      isHashtagSearch: false,
      searchedTopics: [],
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

// GET /articles/topics - Get all topics with counts
app.get('/topics', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');

  const articleRepo = new ArticleRepository(c.env.DB);
  const usecase = new GetTopicsUsecase(articleRepo);
  const topics = await usecase.execute(limit);

  return c.json({ topics });
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

  const isPublished = !!article.publishedAt && article.status.toString() !== 'deleted';

  if (!isPublished) {
    throw new NotFoundError('Article', slug);
  }

  // Get cached Markdown
  const kvClient = new KVClient(c.env.KV);
  const markdown = await kvClient.getArticleMarkdown(user.id, slug);

  // Convert Markdown to HTML
  let html = '';
  if (markdown) {
    const parsed = parseArticle(markdown, c.env.EMBED_ORIGIN);
    html = convertImagePaths(
      parsed.html,
      user.id,
      slug,
      c.env.IMAGE_URL
    );
  }

  // Get topics
  const topics = await articleRepo.findTopics(article.id);

  return c.json({
    ...toPublicArticle(article),
    html,
    topics,
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
  const articlesWithTopics = await buildArticleListResponse(
    articleRepo,
    userRepo,
    articles,
    'public'
  );

  return c.json({
    articles: articlesWithTopics,
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
  articles: ArticleEntity[],
  visibility: 'public' | 'owner'
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
      const topics = await articleRepo.findTopics(article.id);
      const author = await getAuthor(article.userId);

      const articleJson = visibility === 'public' ? toPublicArticle(article) : article.toJSON();

      return {
        ...articleJson,
        topics,
        author,
      };
    })
  );
}

function toPublicArticle(article: ArticleEntity) {
  const json = article.toJSON();

  return {
    ...json,
    status: 'published',
    rejectionReason: undefined,
  };
}
