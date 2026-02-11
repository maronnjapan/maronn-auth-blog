import { describe, expect, it } from 'vitest';
import { Article, type ArticleProps } from './article';
import { ArticleStatus } from '../value-objects/article-status';
import { Slug } from '../value-objects/slug';

const baseArticleProps: ArticleProps = {
  id: 'article-1',
  userId: 'user-1',
  slug: Slug.create('test-article'),
  title: 'Original Title',
  category: '認証',
  targetCategories: ['authentication'],
  status: ArticleStatus.published(),
  githubPath: 'articles/test-article.md',
  githubSha: 'old-sha',
  publishedSha: 'old-sha',
  rejectionReason: undefined,
  publishedAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('Article entity', () => {
  describe('markForUpdate', () => {
    it('updates metadata (title, category, targetCategories) along with status and SHA', () => {
      const article = new Article({ ...baseArticleProps });

      article.markForUpdate('new-sha', {
        title: 'Updated Title',
        category: 'セキュリティ',
        targetCategories: ['security', 'authorization'],
      });

      expect(article.status.toString()).toBe('pending_update');
      expect(article.githubSha).toBe('new-sha');
      expect(article.title).toBe('Updated Title');
      expect(article.category).toBe('セキュリティ');
      expect(article.targetCategories).toEqual(['security', 'authorization']);
      expect(article.rejectionReason).toBeUndefined();
    });

    it('keeps original metadata when no metadata is provided', () => {
      const article = new Article({ ...baseArticleProps });

      article.markForUpdate('new-sha');

      expect(article.status.toString()).toBe('pending_update');
      expect(article.githubSha).toBe('new-sha');
      expect(article.title).toBe('Original Title');
      expect(article.category).toBe('認証');
      expect(article.targetCategories).toEqual(['authentication']);
    });

    it('allows partial metadata updates', () => {
      const article = new Article({ ...baseArticleProps });

      article.markForUpdate('new-sha', {
        targetCategories: ['security'],
      });

      expect(article.title).toBe('Original Title');
      expect(article.category).toBe('認証');
      expect(article.targetCategories).toEqual(['security']);
    });

    it('throws when article status does not allow updates', () => {
      const article = new Article({
        ...baseArticleProps,
        status: ArticleStatus.pendingNew(),
      });

      expect(() => article.markForUpdate('new-sha')).toThrow();
    });
  });

  describe('updatePendingContent', () => {
    it('updates metadata and SHA for pending_new articles', () => {
      const article = new Article({
        ...baseArticleProps,
        status: ArticleStatus.pendingNew(),
      });

      article.updatePendingContent('new-sha', {
        title: 'Updated Title',
        category: 'セキュリティ',
        targetCategories: ['security'],
      });

      expect(article.status.toString()).toBe('pending_new');
      expect(article.githubSha).toBe('new-sha');
      expect(article.title).toBe('Updated Title');
      expect(article.category).toBe('セキュリティ');
      expect(article.targetCategories).toEqual(['security']);
    });

    it('updates metadata and SHA for pending_update articles', () => {
      const article = new Article({
        ...baseArticleProps,
        status: ArticleStatus.pendingUpdate(),
      });

      article.updatePendingContent('new-sha', {
        targetCategories: ['authorization', 'security'],
      });

      expect(article.status.toString()).toBe('pending_update');
      expect(article.githubSha).toBe('new-sha');
      expect(article.targetCategories).toEqual(['authorization', 'security']);
    });

    it('keeps original metadata when no metadata is provided', () => {
      const article = new Article({
        ...baseArticleProps,
        status: ArticleStatus.pendingNew(),
      });

      article.updatePendingContent('new-sha');

      expect(article.githubSha).toBe('new-sha');
      expect(article.title).toBe('Original Title');
      expect(article.category).toBe('認証');
      expect(article.targetCategories).toEqual(['authentication']);
    });
  });

  describe('approve', () => {
    it('sets publishedAt on initial approval (pending_new -> published)', () => {
      const article = new Article({
        ...baseArticleProps,
        status: ArticleStatus.pendingNew(),
        publishedAt: undefined,
        publishedSha: undefined,
      });

      const beforeApproval = Date.now();
      article.approve('new-sha');
      const afterApproval = Date.now();

      expect(article.status.toString()).toBe('published');
      expect(article.publishedSha).toBe('new-sha');
      expect(article.publishedAt).toBeDefined();
      expect(article.publishedAt!.getTime()).toBeGreaterThanOrEqual(beforeApproval);
      expect(article.publishedAt!.getTime()).toBeLessThanOrEqual(afterApproval);
      expect(article.rejectionReason).toBeUndefined();
    });

    it('preserves original publishedAt on re-approval (pending_update -> published)', () => {
      const originalPublishedAt = new Date('2024-01-01');
      const article = new Article({
        ...baseArticleProps,
        status: ArticleStatus.pendingUpdate(),
        publishedAt: originalPublishedAt,
        publishedSha: 'old-sha',
      });

      article.approve('new-sha');

      expect(article.status.toString()).toBe('published');
      expect(article.publishedSha).toBe('new-sha');
      expect(article.publishedAt).toEqual(originalPublishedAt); // 元の公開日が維持される
      expect(article.updatedAt.getTime()).toBeGreaterThan(originalPublishedAt.getTime()); // 更新日は新しい
    });

    it('clears rejection reason on re-approval after update', () => {
      // 却下された記事がユーザーによって更新され、pending_updateになったケース
      const article = new Article({
        ...baseArticleProps,
        status: ArticleStatus.pendingUpdate(),
        rejectionReason: 'Some reason',
      });

      article.approve('new-sha');

      expect(article.status.toString()).toBe('published');
      expect(article.rejectionReason).toBeUndefined();
    });

    it('throws when article status does not allow approval (rejected)', () => {
      const article = new Article({
        ...baseArticleProps,
        status: ArticleStatus.rejected(),
      });

      expect(() => article.approve('new-sha')).toThrow();
    });

    it('throws when article status does not allow approval (deleted)', () => {
      const article = new Article({
        ...baseArticleProps,
        status: ArticleStatus.deleted(),
      });

      expect(() => article.approve('new-sha')).toThrow();
    });
  });
});
