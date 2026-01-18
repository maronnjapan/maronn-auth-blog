import { ArticleRepository } from '../../infrastructure/repositories/article-repository';

export interface CategoryWithCount {
  category: string;
  count: number;
}

export class GetCategoriesUsecase {
  constructor(private articleRepo: ArticleRepository) {}

  async execute(): Promise<CategoryWithCount[]> {
    return this.articleRepo.getAllCategories();
  }
}
