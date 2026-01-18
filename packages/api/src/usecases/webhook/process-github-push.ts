import { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import { UserRepository } from '../../infrastructure/repositories/user-repository';
import { RepositoryRepository } from '../../infrastructure/repositories/repository-repository';
import { NotificationRepository } from '../../infrastructure/repositories/notification-repository';
import { GitHubClient } from '../../infrastructure/github-client';
import { Article, type ArticleProps } from '../../domain/entities/article';
import { ArticleStatus } from '../../domain/value-objects/article-status';
import { Slug } from '../../domain/value-objects/slug';
import { extractFrontmatter } from '../../utils/markdown-parser';
import { CreateNotificationUsecase } from '../notification/create-notification';

export interface GitHubPushEvent {
  ref: string;
  repository: {
    full_name: string;
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
    private githubClient: GitHubClient
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
    if (!user || !user.githubInstallationId) {
      console.info(`[ProcessGitHubPush] User or installation not found for repo ${repoFullName}`);
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
          user.githubInstallationId,
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
    installationId: string,
    owner: string,
    repoName: string,
    filePath: string
  ): Promise<void> {
    console.info(`[ProcessGitHubPush] Processing file: ${filePath}`);

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

    if (!title) {
      console.info(`[ProcessGitHubPush] File ${filePath} has no title, skipping`);
      return;
    }

    // Extract slug from filename
    const fileName = filePath.split('/').pop() || '';
    const slugValue = fileName.replace(/\.md$/, '');

    // Check if article already exists
    const existingArticle = await this.articleRepo.findByGitHubPath(userId, filePath);

    if (existingArticle) {
      // Article exists - check if it needs update
      if (existingArticle.githubSha === sha) {
        console.info(`[ProcessGitHubPush] File ${filePath} unchanged (same SHA), skipping`);
        return;
      }

      // Mark for update if currently published
      if (existingArticle.status.toString() === 'published') {
        existingArticle.markForUpdate(sha);
        await this.articleRepo.save(existingArticle);

        // Create notification
        const createNotification = new CreateNotificationUsecase(this.notificationRepo);
        await createNotification.execute({
          userId,
          type: 'article_update_detected',
          articleId: existingArticle.id,
          message: `Update detected for "${existingArticle.title}". Your article is now pending re-review.`,
        });

        console.info(`[ProcessGitHubPush] Article ${existingArticle.id} marked for update`);
      }
    } else {
      // Create new article
      const slug = Slug.create(slugValue);

      const articleProps: ArticleProps = {
        id: crypto.randomUUID(),
        userId,
        slug,
        title,
        category,
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

      // Save tags if present
      if (Array.isArray(frontmatter.tags)) {
        const tags = (frontmatter.tags as string[]).filter(t => typeof t === 'string');
        if (tags.length > 0) {
          await this.articleRepo.saveTags(article.id, tags);
        }
      }

      console.info(`[ProcessGitHubPush] New article created: ${article.id}`);
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

      console.info(`[ProcessGitHubPush] Article ${article.id} marked as deleted`);
    }
  }
}
