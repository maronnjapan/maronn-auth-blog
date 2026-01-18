import { ArticleRepository } from '../../infrastructure/repositories/article-repository';

export interface TagWithCount {
  tag: string;
  count: number;
}

export class GetTagsUsecase {
  constructor(private articleRepo: ArticleRepository) {}

  async execute(limit: number = 50): Promise<TagWithCount[]> {
    return this.articleRepo.getAllTags(limit);
  }
}
