import { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import { KVClient } from '../../infrastructure/storage/kv-client';
import { R2Client } from '../../infrastructure/storage/r2-client';
import { ArticleNotFoundError, UnauthorizedArticleAccessError } from '../../domain/errors/domain-errors';

export interface DeleteArticleInput {
  articleId: string;
  userId: string;
}

export class DeleteArticleUsecase {
  constructor(
    private articleRepo: ArticleRepository,
    private kvClient: KVClient,
    private r2Client: R2Client
  ) {}

  async execute(input: DeleteArticleInput): Promise<void> {
    const { articleId, userId } = input;

    console.info(`[DeleteArticle] Starting deletion for article: ${articleId}`);

    // Find the article
    const article = await this.articleRepo.findById(articleId);
    if (!article) {
      throw new ArticleNotFoundError(articleId);
    }

    // Check ownership
    if (article.userId !== userId) {
      throw new UnauthorizedArticleAccessError(articleId);
    }

    // Mark article as deleted (domain logic)
    article.delete();
    await this.articleRepo.save(article);

    // Remove from FTS index
    await this.articleRepo.removeFtsIndex(articleId);

    // Clean up cached data
    await Promise.all([
      this.kvClient.deleteArticleMarkdown(userId, article.slug.toString()),
      this.r2Client.deleteImages(userId, article.slug.toString()),
    ]);

    console.info(`[DeleteArticle] Article ${articleId} deleted successfully`);
  }
}
