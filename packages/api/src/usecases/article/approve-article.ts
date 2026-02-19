import { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import { UserRepository } from '../../infrastructure/repositories/user-repository';
import { RepositoryRepository } from '../../infrastructure/repositories/repository-repository';
import { NotificationRepository } from '../../infrastructure/repositories/notification-repository';
import { FollowRepository } from '../../infrastructure/repositories/follow-repository';
import { NotificationSettingsRepository } from '../../infrastructure/repositories/notification-settings-repository';
import { GitHubClient } from '../../infrastructure/github-client';
import { KVClient } from '../../infrastructure/storage/kv-client';
import { R2Client } from '../../infrastructure/storage/r2-client';
import { ResendClient } from '../../infrastructure/resend-client';
import { Auth0UserInfoClient } from '../../infrastructure/auth0-userinfo-client';
import { ArticleNotFoundError, RepositoryNotFoundError } from '../../domain/errors/domain-errors';
import { parseArticle } from '../../utils/markdown-parser';
import { validateImageCount, validateImageContentType, validateImageSize, getImageFilename } from '../../utils/image-validator';
import { CreateNotificationUsecase } from '../notification/create-notification';
import { SendEmailNotificationUsecase } from '../notification/send-email-notification';
import { NotifyFollowersUsecase } from '../notification/notify-followers';

export class ApproveArticleUsecase {
  constructor(
    private articleRepo: ArticleRepository,
    private userRepo: UserRepository,
    private repoRepo: RepositoryRepository,
    private notificationRepo: NotificationRepository,
    private followRepo: FollowRepository,
    private notificationSettingsRepo: NotificationSettingsRepository,
    private githubClient: GitHubClient,
    private kvClient: KVClient,
    private r2Client: R2Client,
    private resendClient: ResendClient,
    private auth0UserInfoClient: Auth0UserInfoClient,
    private embedOrigin: string,
    private webUrl: string,
  ) { }

  async execute(articleId: string, summary: string): Promise<void> {
    console.info(`[ApproveArticle] Starting approval for article: ${articleId}`);

    // Get article
    const article = await this.articleRepo.findById(articleId);
    if (!article) {
      throw new ArticleNotFoundError(articleId);
    }

    // Get user
    const user = await this.userRepo.findById(article.userId);
    if (!user) {
      throw new ArticleNotFoundError(article.userId);
    }

    // Get repository
    const repo = await this.repoRepo.findByUserId(user.id);
    if (!repo) {
      throw new RepositoryNotFoundError(user.id);
    }

    if (!user.githubInstallationId) {
      throw new Error('GitHub installation not found for user');
    }

    // Parse repo full name
    const [owner, repoName] = repo.github_repo_full_name.split('/');

    // Fetch markdown from GitHub
    console.info(`[ApproveArticle] Fetching markdown from GitHub: ${article.githubPath}`);
    const { content: markdown, sha } = await this.githubClient.fetchFile(
      user.githubInstallationId,
      owner,
      repoName,
      article.githubPath
    );

    // Parse article
    const parsed = parseArticle(markdown, this.embedOrigin);

    // Validate image count
    validateImageCount(parsed.images.length);

    // Fetch and save images to R2
    console.info(`[ApproveArticle] Processing ${parsed.images.length} images`);
    for (const imagePath of parsed.images) {
      const filename = getImageFilename(imagePath);
      const imagePathInRepo = imagePath.replace(/^\.?\//, '');

      const imageData = await this.githubClient.fetchImage(
        user.githubInstallationId,
        owner,
        repoName,
        imagePathInRepo
      );

      // Detect content type (simplified)
      let contentType = 'image/jpeg';
      if (filename.endsWith('.png')) contentType = 'image/png';
      else if (filename.endsWith('.webp')) contentType = 'image/webp';
      else if (filename.endsWith('.gif')) contentType = 'image/gif';

      validateImageContentType(contentType);
      validateImageSize(imageData.byteLength);

      await this.r2Client.putImage(
        user.id,
        article.slug.toString(),
        filename,
        imageData,
        contentType
      );
    }

    // Save Markdown to KV
    console.info(`[ApproveArticle] Saving Markdown to KV`);
    await this.kvClient.setArticleMarkdown(user.id, article.slug.toString(), markdown);

    // Update article status
    article.approve(sha);
    await this.articleRepo.save(article);

    // Save topics
    await this.articleRepo.saveTopics(article.id, parsed.frontmatter.topics);

    // Save search summary and update FTS index
    await this.articleRepo.saveSummary(article.id, summary);
    await this.articleRepo.syncFtsIndex(article.id, article.title, summary);

    // Create notification for the user
    const createNotification = new CreateNotificationUsecase(this.notificationRepo);
    await createNotification.execute({
      userId: article.userId,
      type: 'article_approved',
      articleId: article.id,
      message: `Your article "${article.title}" has been approved and published.`,
    });

    // Send email notification
    const sendEmailNotification = new SendEmailNotificationUsecase(
      this.auth0UserInfoClient,
      this.resendClient
    );
    await sendEmailNotification.execute({
      userId: article.userId,
      auth0UserId: user.auth0UserId ?? `github|${user.githubUserId}`,
      type: 'article_approved',
      articleTitle: article.title,
      articleSlug: article.slug.toString(),
      username: user.username,
      webUrl: this.webUrl,
    });

    // Notify followers about the new article
    const notifyFollowers = new NotifyFollowersUsecase(
      this.followRepo,
      this.notificationRepo,
      this.notificationSettingsRepo,
      this.userRepo,
      this.auth0UserInfoClient,
      this.resendClient,
    );
    await notifyFollowers.execute({
      authorId: user.id,
      articleId: article.id,
      articleTitle: article.title,
      articleSlug: article.slug.toString(),
      authorUsername: user.username,
      authorDisplayName: user.displayName,
      webUrl: this.webUrl,
    });

    console.info(`[ApproveArticle] Article approved: ${articleId}`);
  }
}
