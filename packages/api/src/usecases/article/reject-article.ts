import { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import { NotificationRepository } from '../../infrastructure/repositories/notification-repository';
import { ArticleNotFoundError } from '../../domain/errors/domain-errors';
import { ValidationError } from '@maronn-auth-blog/shared';
import { CreateNotificationUsecase } from '../notification/create-notification';

export class RejectArticleUsecase {
  constructor(
    private articleRepo: ArticleRepository,
    private notificationRepo: NotificationRepository
  ) {}

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

    // Remove from FTS index and features (rejected articles should not be searchable)
    await this.articleRepo.removeFtsIndex(article.id);
    await this.articleRepo.removeSummary(article.id);

    // Create notification for the user
    const createNotification = new CreateNotificationUsecase(this.notificationRepo);
    await createNotification.execute({
      userId: article.userId,
      type: 'article_rejected',
      articleId: article.id,
      message: `Your article "${article.title}" has been rejected. Reason: ${reason}`,
    });

    console.info(`[RejectArticle] Article rejected: ${articleId}`);
  }
}
