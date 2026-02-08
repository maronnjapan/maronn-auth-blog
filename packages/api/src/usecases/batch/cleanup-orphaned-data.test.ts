import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CleanupOrphanedDataUsecase } from './cleanup-orphaned-data';
import type { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import type { KVClient } from '../../infrastructure/storage/kv-client';
import type { R2Client } from '../../infrastructure/storage/r2-client';
import { Article } from '../../domain/entities/article';
import { ArticleStatus } from '../../domain/value-objects/article-status';
import { Slug } from '../../domain/value-objects/slug';

function createArticle(overrides: Partial<{
  id: string;
  userId: string;
  slug: string;
  status: ArticleStatus;
}> = {}) {
  return new Article({
    id: overrides.id ?? 'article-1',
    userId: overrides.userId ?? 'user-1',
    slug: Slug.create(overrides.slug ?? 'test-article'),
    title: 'Test Article',
    category: undefined,
    status: overrides.status ?? ArticleStatus.published(),
    githubPath: 'articles/test-article.md',
    githubSha: 'abc123',
    publishedSha: 'abc123',
    rejectionReason: undefined,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    targetCategories: ['authentication'],
  });
}

describe('CleanupOrphanedDataUsecase', () => {
  let articleRepo: ArticleRepository;
  let kvClient: KVClient;
  let r2Client: R2Client;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createUsecase(options: {
    findByUserIdAndSlug?: (userId: string, slug: string) => Promise<Article | null>;
    kvKeys?: string[];
    r2Prefixes?: Array<{ userId: string; slug: string }>;
  } = {}) {
    articleRepo = {
      findByUserIdAndSlug: options.findByUserIdAndSlug ?? vi.fn().mockResolvedValue(null),
    } as unknown as ArticleRepository;

    kvClient = {
      listArticleKeys: vi.fn().mockResolvedValue(options.kvKeys ?? []),
      deleteArticleMarkdown: vi.fn().mockResolvedValue(undefined),
    } as unknown as KVClient;

    r2Client = {
      listAllImagePrefixes: vi.fn().mockResolvedValue(options.r2Prefixes ?? []),
      deleteImages: vi.fn().mockResolvedValue(undefined),
    } as unknown as R2Client;

    return new CleanupOrphanedDataUsecase(articleRepo, kvClient, r2Client);
  }

  it('does nothing when KV and R2 are empty', async () => {
    const usecase = createUsecase();

    const result = await usecase.execute();

    expect(result.deletedKvKeys).toBe(0);
    expect(result.deletedR2Prefixes).toBe(0);
    expect(kvClient.deleteArticleMarkdown).not.toHaveBeenCalled();
    expect(r2Client.deleteImages).not.toHaveBeenCalled();
  });

  it('deletes KV entries for articles that do not exist in DB', async () => {
    const usecase = createUsecase({
      kvKeys: ['article:user-1:orphaned-slug'],
      findByUserIdAndSlug: vi.fn().mockResolvedValue(null),
    });

    const result = await usecase.execute();

    expect(result.deletedKvKeys).toBe(1);
    expect(kvClient.deleteArticleMarkdown).toHaveBeenCalledWith('user-1', 'orphaned-slug');
  });

  it('deletes KV entries for articles with deleted status', async () => {
    const deletedArticle = createArticle({
      userId: 'user-1',
      slug: 'deleted-slug',
      status: ArticleStatus.deleted(),
    });
    const usecase = createUsecase({
      kvKeys: ['article:user-1:deleted-slug'],
      findByUserIdAndSlug: vi.fn().mockResolvedValue(deletedArticle),
    });

    const result = await usecase.execute();

    expect(result.deletedKvKeys).toBe(1);
    expect(kvClient.deleteArticleMarkdown).toHaveBeenCalledWith('user-1', 'deleted-slug');
  });

  it('keeps KV entries for active articles', async () => {
    const activeArticle = createArticle({
      userId: 'user-1',
      slug: 'active-slug',
      status: ArticleStatus.published(),
    });
    const usecase = createUsecase({
      kvKeys: ['article:user-1:active-slug'],
      findByUserIdAndSlug: vi.fn().mockResolvedValue(activeArticle),
    });

    const result = await usecase.execute();

    expect(result.deletedKvKeys).toBe(0);
    expect(kvClient.deleteArticleMarkdown).not.toHaveBeenCalled();
  });

  it('keeps KV entries for pending articles', async () => {
    const pendingArticle = createArticle({
      userId: 'user-1',
      slug: 'pending-slug',
      status: ArticleStatus.pendingNew(),
    });
    const usecase = createUsecase({
      kvKeys: ['article:user-1:pending-slug'],
      findByUserIdAndSlug: vi.fn().mockResolvedValue(pendingArticle),
    });

    const result = await usecase.execute();

    expect(result.deletedKvKeys).toBe(0);
    expect(kvClient.deleteArticleMarkdown).not.toHaveBeenCalled();
  });

  it('deletes R2 images for articles that do not exist in DB', async () => {
    const usecase = createUsecase({
      r2Prefixes: [{ userId: 'user-1', slug: 'orphaned-slug' }],
      findByUserIdAndSlug: vi.fn().mockResolvedValue(null),
    });

    const result = await usecase.execute();

    expect(result.deletedR2Prefixes).toBe(1);
    expect(r2Client.deleteImages).toHaveBeenCalledWith('user-1', 'orphaned-slug');
  });

  it('deletes R2 images for articles with deleted status', async () => {
    const deletedArticle = createArticle({
      userId: 'user-1',
      slug: 'deleted-slug',
      status: ArticleStatus.deleted(),
    });
    const usecase = createUsecase({
      r2Prefixes: [{ userId: 'user-1', slug: 'deleted-slug' }],
      findByUserIdAndSlug: vi.fn().mockResolvedValue(deletedArticle),
    });

    const result = await usecase.execute();

    expect(result.deletedR2Prefixes).toBe(1);
    expect(r2Client.deleteImages).toHaveBeenCalledWith('user-1', 'deleted-slug');
  });

  it('keeps R2 images for active articles', async () => {
    const activeArticle = createArticle({
      userId: 'user-1',
      slug: 'active-slug',
      status: ArticleStatus.published(),
    });
    const usecase = createUsecase({
      r2Prefixes: [{ userId: 'user-1', slug: 'active-slug' }],
      findByUserIdAndSlug: vi.fn().mockResolvedValue(activeArticle),
    });

    const result = await usecase.execute();

    expect(result.deletedR2Prefixes).toBe(0);
    expect(r2Client.deleteImages).not.toHaveBeenCalled();
  });

  it('handles mixed orphaned and active data', async () => {
    const activeArticle = createArticle({
      userId: 'user-1',
      slug: 'active-slug',
      status: ArticleStatus.published(),
    });

    const findByUserIdAndSlug = vi.fn()
      .mockImplementation((userId: string, slug: string) => {
        if (userId === 'user-1' && slug === 'active-slug') {
          return Promise.resolve(activeArticle);
        }
        return Promise.resolve(null);
      });

    const usecase = createUsecase({
      kvKeys: [
        'article:user-1:active-slug',
        'article:user-1:orphaned-slug',
        'article:user-2:gone-slug',
      ],
      r2Prefixes: [
        { userId: 'user-1', slug: 'active-slug' },
        { userId: 'user-1', slug: 'orphaned-slug' },
        { userId: 'user-3', slug: 'missing-slug' },
      ],
      findByUserIdAndSlug,
    });

    const result = await usecase.execute();

    expect(result.deletedKvKeys).toBe(2);
    expect(result.deletedR2Prefixes).toBe(2);

    expect(kvClient.deleteArticleMarkdown).toHaveBeenCalledWith('user-1', 'orphaned-slug');
    expect(kvClient.deleteArticleMarkdown).toHaveBeenCalledWith('user-2', 'gone-slug');
    expect(kvClient.deleteArticleMarkdown).not.toHaveBeenCalledWith('user-1', 'active-slug');

    expect(r2Client.deleteImages).toHaveBeenCalledWith('user-1', 'orphaned-slug');
    expect(r2Client.deleteImages).toHaveBeenCalledWith('user-3', 'missing-slug');
    expect(r2Client.deleteImages).not.toHaveBeenCalledWith('user-1', 'active-slug');
  });

  it('skips KV keys with unexpected format', async () => {
    const usecase = createUsecase({
      kvKeys: ['article:malformed', 'article:too:many:parts:here'],
    });

    const result = await usecase.execute();

    expect(result.deletedKvKeys).toBe(0);
    expect(kvClient.deleteArticleMarkdown).not.toHaveBeenCalled();
  });
});
