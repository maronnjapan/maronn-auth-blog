import { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import type { Article } from '../../domain/entities/article';
import type { PaginatedResponse } from '@maronn-auth-blog/shared';

export interface GetArticlesByTopicInput {
  topic: string;
  page: number;
  limit: number;
}

export class GetArticlesByTopicUsecase {
  constructor(private articleRepo: ArticleRepository) {}

  async execute(input: GetArticlesByTopicInput): Promise<PaginatedResponse<Article>> {
    const { topic, page, limit } = input;
    const offset = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      this.articleRepo.findPublishedByTopic(topic, limit, offset),
      this.articleRepo.countPublishedByTopic(topic),
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
