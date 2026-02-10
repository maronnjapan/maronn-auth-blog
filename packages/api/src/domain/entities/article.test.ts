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
});
