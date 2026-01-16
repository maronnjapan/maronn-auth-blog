import { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import { ArticleNotFoundError } from '../../domain/errors/domain-errors';
import { ValidationError } from '@maronn-auth-blog/shared';

export class RejectArticleUsecase {
  constructor(private articleRepo: ArticleRepository) {}

  async execute(articleId: string, reason: string): Promise<void> {
    console.info(`[RejectArticle] Starting rejection for article: ${articleId}`);

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Rejection reason is required');
    }

    // Get article
    const article = await this.articleRepo.findById(articleId);
    if (!article) {
      throw new ArticleNotFoundError(articleId);
    }

    // Reject article
    article.reject(reason);
    await this.articleRepo.save(article);

    console.info(`[RejectArticle] Article rejected: ${articleId}`);
  }
}
