import { ArticleRepository } from '../../infrastructure/repositories/article-repository';

export interface TopicWithCount {
  topic: string;
  count: number;
}

export class GetTopicsUsecase {
  constructor(private articleRepo: ArticleRepository) {}

  async execute(limit: number = 50): Promise<TopicWithCount[]> {
    return this.articleRepo.getAllTopics(limit);
  }
}
