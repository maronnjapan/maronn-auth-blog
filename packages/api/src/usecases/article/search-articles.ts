import { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import type { Article } from '../../domain/entities/article';
import type { PaginatedResponse } from '@maronn-auth-blog/shared';

export interface SearchArticlesInput {
  query: string;
  page: number;
  limit: number;
}

export class SearchArticlesUsecase {
  constructor(private articleRepo: ArticleRepository) {}

  async execute(input: SearchArticlesInput): Promise<PaginatedResponse<Article>> {
    const { query, page, limit } = input;
    const offset = (page - 1) * limit;

    // Escape special FTS5 characters for safety
    const safeQuery = query.replace(/[*:^]/g, '');

    if (!safeQuery.trim()) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      };
    }

    const [articles, total] = await Promise.all([
      this.articleRepo.searchByTitle(safeQuery, limit, offset),
      this.articleRepo.countSearchResults(safeQuery),
    ]);

    return {
      items: articles,
      total,
      page,
      limit,
      hasMore: offset + articles.length < total,
    };
  }
}
