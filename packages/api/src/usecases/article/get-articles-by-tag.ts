import { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import type { Article } from '../../domain/entities/article';
import type { PaginatedResponse } from '@maronn-auth-blog/shared';

export interface GetArticlesByTagInput {
  tag: string;
  page: number;
  limit: number;
}

export class GetArticlesByTagUsecase {
  constructor(private articleRepo: ArticleRepository) {}

  async execute(input: GetArticlesByTagInput): Promise<PaginatedResponse<Article>> {
    const { tag, page, limit } = input;
    const offset = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      this.articleRepo.findPublishedByTag(tag, limit, offset),
      this.articleRepo.countPublishedByTag(tag),
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
