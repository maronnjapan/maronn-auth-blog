import { Article, type ArticleProps } from '../../domain/entities/article';
import { ArticleStatus } from '../../domain/value-objects/article-status';
import { Slug } from '../../domain/value-objects/slug';
import type { ArticleStatus as ArticleStatusType } from '@maronn-auth-blog/shared';

interface ArticleRow {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  category: string | null;
  status: ArticleStatusType;
  github_path: string;
  github_sha: string | null;
  published_sha: string | null;
  rejection_reason: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export class ArticleRepository {
  constructor(private db: D1Database) {}

  private rowToEntity(row: ArticleRow): Article {
    const props: ArticleProps = {
      id: row.id,
      userId: row.user_id,
      slug: Slug.create(row.slug),
      title: row.title,
      category: row.category ?? undefined,
      status: ArticleStatus.fromString(row.status),
      githubPath: row.github_path,
      githubSha: row.github_sha ?? undefined,
      publishedSha: row.published_sha ?? undefined,
      rejectionReason: row.rejection_reason ?? undefined,
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
    return new Article(props);
  }

  async findById(id: string): Promise<Article | null> {
    const result = await this.db
      .prepare('SELECT * FROM articles WHERE id = ?')
      .bind(id)
      .first<ArticleRow>();

    return result ? this.rowToEntity(result) : null;
  }

  async findByUserIdAndSlug(userId: string, slug: string): Promise<Article | null> {
    const result = await this.db
      .prepare('SELECT * FROM articles WHERE user_id = ? AND slug = ?')
      .bind(userId, slug)
      .first<ArticleRow>();

    return result ? this.rowToEntity(result) : null;
  }

  async findByUserId(userId: string): Promise<Article[]> {
    const results = await this.db
      .prepare('SELECT * FROM articles WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<ArticleRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  async findPublished(limit: number = 20, offset: number = 0): Promise<Article[]> {
    const results = await this.db
      .prepare(
        'SELECT * FROM articles WHERE status = ? ORDER BY published_at DESC LIMIT ? OFFSET ?'
      )
      .bind('published', limit, offset)
      .all<ArticleRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  async findPublishedByUserId(userId: string): Promise<Article[]> {
    const results = await this.db
      .prepare(
        'SELECT * FROM articles WHERE user_id = ? AND status = ? ORDER BY published_at DESC'
      )
      .bind(userId, 'published')
      .all<ArticleRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  async findPendingReview(): Promise<Article[]> {
    const results = await this.db
      .prepare(
        `SELECT * FROM articles
         WHERE status IN ('pending_new', 'pending_update')
         ORDER BY created_at ASC`
      )
      .all<ArticleRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  async save(article: Article): Promise<void> {
    const json = article.toJSON();

    await this.db
      .prepare(`
        INSERT INTO articles (
          id, user_id, slug, title, category, status,
          github_path, github_sha, published_sha, rejection_reason,
          published_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          category = excluded.category,
          status = excluded.status,
          github_sha = excluded.github_sha,
          published_sha = excluded.published_sha,
          rejection_reason = excluded.rejection_reason,
          published_at = excluded.published_at,
          updated_at = excluded.updated_at
      `)
      .bind(
        json.id,
        json.userId,
        json.slug,
        json.title,
        json.category ?? null,
        json.status,
        json.githubPath,
        json.githubSha ?? null,
        json.publishedSha ?? null,
        json.rejectionReason ?? null,
        json.publishedAt ?? null,
        json.createdAt,
        json.updatedAt
      )
      .run();
  }

  async saveTags(articleId: string, tags: string[]): Promise<void> {
    // Delete existing tags
    await this.db
      .prepare('DELETE FROM article_tags WHERE article_id = ?')
      .bind(articleId)
      .run();

    // Insert new tags
    for (const tag of tags) {
      const tagId = crypto.randomUUID();
      await this.db
        .prepare('INSERT INTO article_tags (id, article_id, tag) VALUES (?, ?, ?)')
        .bind(tagId, articleId, tag)
        .run();
    }
  }

  async findTags(articleId: string): Promise<string[]> {
    const results = await this.db
      .prepare('SELECT tag FROM article_tags WHERE article_id = ?')
      .bind(articleId)
      .all<{ tag: string }>();

    return results.results.map((row) => row.tag);
  }
}
