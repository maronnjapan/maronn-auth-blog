import { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import type { Article } from '../../domain/entities/article';
import type { PaginatedResponse } from '@maronn-auth-blog/shared';

export interface GetArticlesByCategoryInput {
  category: string;
  page: number;
  limit: number;
}

export class GetArticlesByCategoryUsecase {
  constructor(private articleRepo: ArticleRepository) {}

  async execute(input: GetArticlesByCategoryInput): Promise<PaginatedResponse<Article>> {
    const { category, page, limit } = input;
    const offset = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      this.articleRepo.findPublishedByCategory(category, limit, offset),
      this.articleRepo.countPublishedByCategory(category),
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
