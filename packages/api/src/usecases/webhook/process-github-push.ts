import { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import { UserRepository } from '../../infrastructure/repositories/user-repository';
import { RepositoryRepository } from '../../infrastructure/repositories/repository-repository';
import { NotificationRepository } from '../../infrastructure/repositories/notification-repository';
import { GitHubClient } from '../../infrastructure/github-client';
import { KVClient } from '../../infrastructure/storage/kv-client';
import { R2Client } from '../../infrastructure/storage/r2-client';
import { Article, type ArticleProps } from '../../domain/entities/article';
import { ArticleStatus } from '../../domain/value-objects/article-status';
import { Slug } from '../../domain/value-objects/slug';
import { extractFrontmatter, extractImagePaths } from '../../utils/markdown-parser';
import { CreateNotificationUsecase } from '../notification/create-notification';
import type { TargetCategory } from '@maronn-auth-blog/shared';
import {
  validateImageCount,
  validateImageContentType,
  validateImageSize,
  getImageFilename,
} from '../../utils/image-validator';
import type { EmailService } from '../../infrastructure/email/resend-email-service';

export interface GitHubPushEvent {
  ref: string;
  repository: {
    full_name: string;
  };
  installation?: {
    id: number;
  };
  commits: Array<{
    added: string[];
    modified: string[];
    removed: string[];
  }>;
}

export class ProcessGitHubPushUsecase {
  constructor(
    private articleRepo: ArticleRepository,
    private userRepo: UserRepository,
    private repoRepo: RepositoryRepository,
    private notificationRepo: NotificationRepository,
    private githubClient: GitHubClient,
    private kvClient: KVClient,
    private r2Client: R2Client,
    private imageUrl: string,
    private emailService?: EmailService,
    private adminNotificationEmail?: string
  ) {}

  async execute(event: GitHubPushEvent): Promise<void> {
    console.info(`[ProcessGitHubPush] Processing push to ${event.repository.full_name}`);

    // Only process pushes to main branch
    if (event.ref !== 'refs/heads/main') {
      console.info(`[ProcessGitHubPush] Ignoring non-main branch: ${event.ref}`);
      return;
    }

    const repoFullName = event.repository.full_name;
    const [owner, repoName] = repoFullName.split('/');

    // Find the repository and user
    const repo = await this.repoRepo.findByGitHubRepoFullName(repoFullName);
    if (!repo) {
      console.info(`[ProcessGitHubPush] No linked repository found for ${repoFullName}`);
      return;
    }

    const user = await this.userRepo.findById(repo.user_id);
    if (!user) {
      console.info(`[ProcessGitHubPush] User not found for repo ${repoFullName}`);
      return;
    }

    const installationId =
      event.installation?.id.toString() ?? user.githubInstallationId;

    if (!installationId) {
      console.info(
        `[ProcessGitHubPush] Installation ID missing for repo ${repoFullName} (event lacks installation info and user record has none)`
      );
      return;
    }

    // Collect all modified/added markdown files
    const mdFiles = new Set<string>();
    const removedFiles = new Set<string>();

    for (const commit of event.commits) {
      for (const file of [...commit.added, ...commit.modified]) {
        if (file.endsWith('.md') && !file.startsWith('.')) {
          mdFiles.add(file);
        }
      }
      for (const file of commit.removed) {
        if (file.endsWith('.md')) {
          removedFiles.add(file);
        }
      }
    }

    console.info(`[ProcessGitHubPush] Found ${mdFiles.size} markdown files to process`);

    // Process each markdown file
    for (const filePath of mdFiles) {
      try {
        await this.processMarkdownFile(
          user.id,
          user.username,
          installationId,
          owner,
          repoName,
          filePath
        );
      } catch (error) {
        console.error(`[ProcessGitHubPush] Error processing ${filePath}:`, error);
      }
    }

    // Handle removed files
    for (const filePath of removedFiles) {
      try {
        await this.handleRemovedFile(user.id, filePath);
      } catch (error) {
        console.error(`[ProcessGitHubPush] Error handling removed file ${filePath}:`, error);
      }
    }
  }

  private async processMarkdownFile(
    userId: string,
    username: string,
    installationId: string,
    owner: string,
    repoName: string,
    filePath: string
  ): Promise<void> {
    console.info(`[ProcessGitHubPush] Processing file: ${filePath}`);

    const repoFullName = `${owner}/${repoName}`;

    // Fetch the markdown file
    const { content: markdown, sha } = await this.githubClient.fetchFile(
      installationId,
      owner,
      repoName,
      filePath
    );

    // Parse frontmatter
    let frontmatter: Record<string, unknown>;
    try {
      const parsed = extractFrontmatter(markdown);
      frontmatter = parsed.frontmatter;
    } catch {
      console.info(`[ProcessGitHubPush] Invalid frontmatter in ${filePath}, skipping`);
      return;
    }

    // Check if published flag is set
    if (!frontmatter.published) {
      console.info(`[ProcessGitHubPush] File ${filePath} is not marked as published, skipping`);
      return;
    }

    const title = (frontmatter.title as string) || '';
    const category = (frontmatter.category as string) || undefined;
    const targetCategory = frontmatter.targetCategory as TargetCategory;
    const topics = frontmatter.topics as string[];

    if (!title) {
      console.info(`[ProcessGitHubPush] File ${filePath} has no title, skipping`);
      return;
    }

    if (!targetCategory) {
      console.info(`[ProcessGitHubPush] File ${filePath} has no targetCategory, skipping`);
      return;
    }

    // Extract slug from filename
    const fileName = filePath.split('/').pop() || '';
    const slugValue = fileName.replace(/\.md$/, '');

    // Check if article already exists
    const existingArticle = await this.articleRepo.findByGitHubPath(userId, filePath);
    const slug = existingArticle?.slug ?? Slug.create(slugValue);
    const shouldCacheDraft = !existingArticle || !existingArticle.publishedAt;

    if (shouldCacheDraft) {
      const processedMarkdown = await this.processImagesAndRewriteMarkdown(
        markdown,
        userId,
        slug.toString(),
        installationId,
        owner,
        repoName
      );

      await this.kvClient.setArticleMarkdown(userId, slug.toString(), processedMarkdown);
    }

    if (existingArticle) {
      // Article exists - check if it needs update
      if (existingArticle.githubSha === sha) {
        console.info(`[ProcessGitHubPush] File ${filePath} unchanged (same SHA), skipping`);
        return;
      }

      // Mark for update if currently published or rejected
      if (['published', 'rejected'].includes(existingArticle.status.toString())) {
        existingArticle.markForUpdate(sha);
        await this.articleRepo.save(existingArticle);

        // Save topics
        await this.articleRepo.saveTopics(existingArticle.id, topics);

        // Create notification
        const createNotification = new CreateNotificationUsecase(this.notificationRepo);
        await createNotification.execute({
          userId,
          type: 'article_update_detected',
          articleId: existingArticle.id,
          message: `Update detected for "${existingArticle.title}". Your article is now pending re-review.`,
        });

        await this.notifyAdmin(
          `Article update pending review: ${existingArticle.title}`,
          [
            `User: ${username}`,
            `Repository: ${repoFullName}`,
            `File: ${filePath}`,
            `Slug: ${existingArticle.slug.toString()}`,
          ].join('\n')
        );

        console.info(`[ProcessGitHubPush] Article ${existingArticle.id} marked for update`);
      }
    } else {
      // Create new article
      const articleProps: ArticleProps = {
        id: crypto.randomUUID(),
        userId,
        slug,
        title,
        category,
        targetCategory,
        status: ArticleStatus.pendingNew(),
        githubPath: filePath,
        githubSha: sha,
        publishedSha: undefined,
        rejectionReason: undefined,
        publishedAt: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const article = new Article(articleProps);
      await this.articleRepo.save(article);

      // Save topics
      await this.articleRepo.saveTopics(article.id, topics);

      console.info(`[ProcessGitHubPush] New article created: ${article.id}`);

      await this.notifyAdmin(
        `New article pending review: ${title}`,
        [
          `User: ${username}`,
          `Repository: ${repoFullName}`,
          `File: ${filePath}`,
          `Slug: ${slug.toString()}`,
        ].join('\n')
      );
    }
  }

  private async handleRemovedFile(userId: string, filePath: string): Promise<void> {
    const article = await this.articleRepo.findByGitHubPath(userId, filePath);
    if (!article) {
      return;
    }

    // Mark article as deleted if it's not already
    if (article.status.toString() !== 'deleted') {
      article.delete();
      await this.articleRepo.save(article);

      // Remove from FTS index
      await this.articleRepo.removeFtsIndex(article.id);

      await Promise.all([
        this.kvClient.deleteArticleMarkdown(userId, article.slug.toString()),
        this.r2Client.deleteImages(userId, article.slug.toString()),
      ]);

      console.info(`[ProcessGitHubPush] Article ${article.id} marked as deleted`);
    }
  }

  private async processImagesAndRewriteMarkdown(
    markdown: string,
    userId: string,
    slug: string,
    installationId: string,
    owner: string,
    repoName: string
  ): Promise<string> {
    const imagePaths = extractImagePaths(markdown);
    if (imagePaths.length === 0) {
      return markdown;
    }

    validateImageCount(imagePaths.length);

    let updatedMarkdown = markdown;
    const uniquePaths = Array.from(new Set(imagePaths));

    for (const imagePath of uniquePaths) {
      const imagePathInRepo = imagePath.replace('./', '');
      const filename = getImageFilename(imagePath);

      const imageData = await this.githubClient.fetchImage(
        installationId,
        owner,
        repoName,
        imagePathInRepo
      );

      const contentType = this.detectContentType(filename);
      validateImageContentType(contentType);
      validateImageSize(imageData.byteLength);

      await this.r2Client.putImage(userId, slug, filename, imageData, contentType);

      const r2Url = `${this.imageUrl}/images/${userId}/${slug}/${filename}`;
      updatedMarkdown = updatedMarkdown.replaceAll(imagePath, r2Url);
    }

    return updatedMarkdown;
  }

  private detectContentType(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.png')) {
      return 'image/png';
    }
    if (lower.endsWith('.webp')) {
      return 'image/webp';
    }
    if (lower.endsWith('.gif')) {
      return 'image/gif';
    }
    return 'image/jpeg';
  }

  private async notifyAdmin(subject: string, text: string): Promise<void> {
    if (!this.emailService || !this.adminNotificationEmail) {
      return;
    }

    try {
      await this.emailService.send({
        to: this.adminNotificationEmail,
        subject,
        text,
        html: text.replace(/\n/g, '<br />'),
      });
    } catch (error) {
      console.error('[ProcessGitHubPush] Failed to send admin notification email', error);
    }
  }
}
