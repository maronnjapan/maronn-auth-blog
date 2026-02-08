import { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import { KVClient } from '../../infrastructure/storage/kv-client';
import { R2Client } from '../../infrastructure/storage/r2-client';

export interface CleanupResult {
  deletedKvKeys: number;
  deletedR2Prefixes: number;
}

export class CleanupOrphanedDataUsecase {
  constructor(
    private articleRepo: ArticleRepository,
    private kvClient: KVClient,
    private r2Client: R2Client
  ) {}

  async execute(): Promise<CleanupResult> {
    console.info('[CleanupOrphanedData] Starting orphaned data cleanup');

    const result: CleanupResult = { deletedKvKeys: 0, deletedR2Prefixes: 0 };

    await this.cleanupKvArticles(result);
    await this.cleanupR2Images(result);

    console.info(
      `[CleanupOrphanedData] Cleanup completed: KV=${result.deletedKvKeys}, R2=${result.deletedR2Prefixes}`
    );

    return result;
  }

  private async cleanupKvArticles(result: CleanupResult): Promise<void> {
    const kvKeys = await this.kvClient.listArticleKeys();
    console.info(`[CleanupOrphanedData] Found ${kvKeys.length} KV article keys`);

    for (const key of kvKeys) {
      // key format: article:{userId}:{slug}
      const parts = key.split(':');
      if (parts.length !== 3) continue;

      const [, userId, slug] = parts;

      const isOrphaned = await this.isOrphanedArticle(userId, slug);
      if (isOrphaned) {
        await this.kvClient.deleteArticleMarkdown(userId, slug);
        result.deletedKvKeys++;
        console.info(`[CleanupOrphanedData] Deleted orphaned KV key: ${key}`);
      }
    }
  }

  private async cleanupR2Images(result: CleanupResult): Promise<void> {
    const imagePrefixes = await this.r2Client.listAllImagePrefixes();
    console.info(`[CleanupOrphanedData] Found ${imagePrefixes.length} R2 image prefixes`);

    for (const { userId, slug } of imagePrefixes) {
      const isOrphaned = await this.isOrphanedArticle(userId, slug);
      if (isOrphaned) {
        await this.r2Client.deleteImages(userId, slug);
        result.deletedR2Prefixes++;
        console.info(
          `[CleanupOrphanedData] Deleted orphaned R2 images: images/${userId}/${slug}/`
        );
      }
    }
  }

  private async isOrphanedArticle(userId: string, slug: string): Promise<boolean> {
    const article = await this.articleRepo.findByUserIdAndSlug(userId, slug);
    return !article || article.status.toString() === 'deleted';
  }
}
