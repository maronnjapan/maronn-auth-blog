import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteArticleUsecase } from './delete-article';
import type { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import type { KVClient } from '../../infrastructure/storage/kv-client';
import type { R2Client } from '../../infrastructure/storage/r2-client';
import { Article } from '../../domain/entities/article';
import { ArticleStatus } from '../../domain/value-objects/article-status';
import { Slug } from '../../domain/value-objects/slug';
import { ArticleNotFoundError, UnauthorizedArticleAccessError } from '../../domain/errors/domain-errors';

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

describe('DeleteArticleUsecase', () => {
  let articleRepo: ArticleRepository;
  let kvClient: KVClient;
  let r2Client: R2Client;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createUsecase(article: Article | null) {
    articleRepo = {
      findById: vi.fn().mockResolvedValue(article),
      save: vi.fn().mockResolvedValue(undefined),
      removeFtsIndex: vi.fn().mockResolvedValue(undefined),
    } as unknown as ArticleRepository;

    kvClient = {
      deleteArticleMarkdown: vi.fn().mockResolvedValue(undefined),
    } as unknown as KVClient;

    r2Client = {
      deleteImages: vi.fn().mockResolvedValue(undefined),
    } as unknown as R2Client;

    return new DeleteArticleUsecase(articleRepo, kvClient, r2Client);
  }

  it('deletes an article owned by the user', async () => {
    const article = createArticle({ id: 'article-1', userId: 'user-1', slug: 'my-article' });
    const usecase = createUsecase(article);

    await usecase.execute({ articleId: 'article-1', userId: 'user-1' });

    expect(article.status.toString()).toBe('deleted');
    expect(articleRepo.save).toHaveBeenCalledWith(article);
    expect(articleRepo.removeFtsIndex).toHaveBeenCalledWith('article-1');
    expect(kvClient.deleteArticleMarkdown).toHaveBeenCalledWith('user-1', 'my-article');
    expect(r2Client.deleteImages).toHaveBeenCalledWith('user-1', 'my-article');
  });

  it('throws ArticleNotFoundError when article does not exist', async () => {
    const usecase = createUsecase(null);

    await expect(
      usecase.execute({ articleId: 'non-existent', userId: 'user-1' })
    ).rejects.toThrow(ArticleNotFoundError);
  });

  it('throws UnauthorizedArticleAccessError when user does not own the article', async () => {
    const article = createArticle({ id: 'article-1', userId: 'owner-user' });
    const usecase = createUsecase(article);

    await expect(
      usecase.execute({ articleId: 'article-1', userId: 'other-user' })
    ).rejects.toThrow(UnauthorizedArticleAccessError);

    expect(articleRepo.save).not.toHaveBeenCalled();
  });

  it('deletes a pending_new article', async () => {
    const article = createArticle({ status: ArticleStatus.pendingNew() });
    const usecase = createUsecase(article);

    await usecase.execute({ articleId: 'article-1', userId: 'user-1' });

    expect(article.status.toString()).toBe('deleted');
    expect(articleRepo.save).toHaveBeenCalled();
  });

  it('deletes a pending_update article', async () => {
    const article = createArticle({ status: ArticleStatus.pendingUpdate() });
    const usecase = createUsecase(article);

    await usecase.execute({ articleId: 'article-1', userId: 'user-1' });

    expect(article.status.toString()).toBe('deleted');
    expect(articleRepo.save).toHaveBeenCalled();
  });

  it('deletes a rejected article', async () => {
    const article = createArticle({ status: ArticleStatus.rejected() });
    const usecase = createUsecase(article);

    await usecase.execute({ articleId: 'article-1', userId: 'user-1' });

    expect(article.status.toString()).toBe('deleted');
    expect(articleRepo.save).toHaveBeenCalled();
  });

  it('throws InvalidStatusTransitionError when article is already deleted', async () => {
    const article = createArticle({ status: ArticleStatus.deleted() });
    const usecase = createUsecase(article);

    await expect(
      usecase.execute({ articleId: 'article-1', userId: 'user-1' })
    ).rejects.toThrow();

    expect(articleRepo.save).not.toHaveBeenCalled();
  });
});
