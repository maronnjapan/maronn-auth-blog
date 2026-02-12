import { Article, type ArticleProps } from '../../domain/entities/article';
import { ArticleStatus } from '../../domain/value-objects/article-status';
import { Slug } from '../../domain/value-objects/slug';
import type { ArticleStatus as ArticleStatusType, TargetCategories } from '@maronn-auth-blog/shared';

interface ArticleRow {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  category: string | null;
  target_categories: string; // JSON string of TargetCategories
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
      targetCategories: JSON.parse(row.target_categories) as TargetCategories,
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
        `SELECT * FROM articles
         WHERE published_at IS NOT NULL AND status = ?
         ORDER BY published_at DESC LIMIT ? OFFSET ?`
      )
      .bind('published', limit, offset)
      .all<ArticleRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  async findPublishedByUserId(userId: string): Promise<Article[]> {
    const results = await this.db
      .prepare(
        `SELECT * FROM articles
         WHERE user_id = ? AND published_at IS NOT NULL AND status = ?
         ORDER BY published_at DESC`
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
          id, user_id, slug, title, category, target_categories, status,
          github_path, github_sha, published_sha, rejection_reason,
          published_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          category = excluded.category,
          target_categories = excluded.target_categories,
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
        JSON.stringify(json.targetCategories),
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

  async saveTopics(articleId: string, topics: string[]): Promise<void> {
    // Delete existing topics
    await this.db
      .prepare('DELETE FROM article_topics WHERE article_id = ?')
      .bind(articleId)
      .run();

    // Insert new topics (normalize to lowercase for consistent searching)
    for (const topic of topics) {
      const topicId = crypto.randomUUID();
      await this.db
        .prepare('INSERT INTO article_topics (id, article_id, topic) VALUES (?, ?, ?)')
        .bind(topicId, articleId, topic.toLowerCase())
        .run();
    }
  }

  async findTopics(articleId: string): Promise<string[]> {
    const results = await this.db
      .prepare('SELECT topic FROM article_topics WHERE article_id = ?')
      .bind(articleId)
      .all<{ topic: string }>();

    return results.results.map((row) => row.topic);
  }

  async countPublished(): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM articles WHERE published_at IS NOT NULL AND status = ?')
      .bind('published')
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async countPublishedByCategory(category: string): Promise<number> {
    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM articles
         WHERE published_at IS NOT NULL AND status = ? AND category = ?`
      )
      .bind('published', category)
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async countPublishedByTopic(topic: string): Promise<number> {
    const result = await this.db
      .prepare(`
        SELECT COUNT(*) as count FROM articles a
        INNER JOIN article_topics at ON a.id = at.article_id
        WHERE a.published_at IS NOT NULL AND a.status = ? AND LOWER(at.topic) = LOWER(?)
      `)
      .bind('published', topic)
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async findPublishedByCategory(
    category: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Article[]> {
    const results = await this.db
      .prepare(
        `SELECT * FROM articles
         WHERE published_at IS NOT NULL AND status = ? AND category = ?
         ORDER BY published_at DESC LIMIT ? OFFSET ?`
      )
      .bind('published', category, limit, offset)
      .all<ArticleRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  async findPublishedByTopic(
    topic: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Article[]> {
    const results = await this.db
      .prepare(
        `SELECT a.* FROM articles a
         INNER JOIN article_topics at ON a.id = at.article_id
         WHERE a.published_at IS NOT NULL AND a.status = ? AND LOWER(at.topic) = LOWER(?)
         ORDER BY a.published_at DESC LIMIT ? OFFSET ?`
      )
      .bind('published', topic, limit, offset)
      .all<ArticleRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  async searchByTitle(
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Article[]> {
    const results = await this.db
      .prepare(
        `SELECT a.* FROM articles a
         INNER JOIN articles_fts fts ON a.id = fts.id
         WHERE fts.articles_fts MATCH ? AND a.published_at IS NOT NULL AND a.status = ?
         ORDER BY a.published_at DESC LIMIT ? OFFSET ?`
      )
      .bind(query, 'published', limit, offset)
      .all<ArticleRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  async countSearchResults(query: string): Promise<number> {
    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM articles a
         INNER JOIN articles_fts fts ON a.id = fts.id
         WHERE fts.articles_fts MATCH ? AND a.published_at IS NOT NULL AND a.status = ?`
      )
      .bind(query, 'published')
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  /**
   * AND検索: すべてのトークンを含む記事を検索
   * @param andQuery FTS5用のANDクエリ (例: "oauth jwt")
   * @param limit 取得件数
   * @param offset オフセット
   */
  async searchByTitleAnd(
    andQuery: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Article[]> {
    if (!andQuery.trim()) {
      return [];
    }

    const results = await this.db
      .prepare(
        `SELECT a.* FROM articles a
         INNER JOIN articles_fts fts ON a.id = fts.id
         WHERE fts.articles_fts MATCH ? AND a.published_at IS NOT NULL AND a.status = ?
         ORDER BY a.published_at DESC LIMIT ? OFFSET ?`
      )
      .bind(andQuery, 'published', limit, offset)
      .all<ArticleRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  /**
   * AND検索の件数を取得
   * @param andQuery FTS5用のANDクエリ
   */
  async countSearchResultsAnd(andQuery: string): Promise<number> {
    if (!andQuery.trim()) {
      return 0;
    }

    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM articles a
         INNER JOIN articles_fts fts ON a.id = fts.id
         WHERE fts.articles_fts MATCH ? AND a.published_at IS NOT NULL AND a.status = ?`
      )
      .bind(andQuery, 'published')
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  /**
   * OR検索: いずれかのトークンを含む記事を検索（AND検索結果を除外）
   * @param orQuery FTS5用のORクエリ (例: "oauth OR jwt")
   * @param excludeIds AND検索で取得済みの記事IDを除外
   * @param limit 取得件数
   * @param offset オフセット
   */
  async searchByTitleOrExcluding(
    orQuery: string,
    excludeIds: string[],
    limit: number = 20,
    offset: number = 0
  ): Promise<Article[]> {
    if (!orQuery.trim()) {
      return [];
    }

    // 除外IDがない場合は通常のOR検索
    if (excludeIds.length === 0) {
      const results = await this.db
        .prepare(
          `SELECT a.* FROM articles a
           INNER JOIN articles_fts fts ON a.id = fts.id
           WHERE fts.articles_fts MATCH ? AND a.published_at IS NOT NULL AND a.status = ?
           ORDER BY a.published_at DESC LIMIT ? OFFSET ?`
        )
        .bind(orQuery, 'published', limit, offset)
        .all<ArticleRow>();

      return results.results.map((row) => this.rowToEntity(row));
    }

    // 除外IDがある場合はNOT INで除外
    const placeholders = excludeIds.map(() => '?').join(', ');
    const results = await this.db
      .prepare(
        `SELECT a.* FROM articles a
         INNER JOIN articles_fts fts ON a.id = fts.id
         WHERE fts.articles_fts MATCH ? AND a.published_at IS NOT NULL AND a.status = ?
         AND a.id NOT IN (${placeholders})
         ORDER BY a.published_at DESC LIMIT ? OFFSET ?`
      )
      .bind(orQuery, 'published', ...excludeIds, limit, offset)
      .all<ArticleRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  /**
   * OR検索の件数を取得（AND検索結果を除外）
   * @param orQuery FTS5用のORクエリ
   * @param excludeIds AND検索で取得済みの記事IDを除外
   */
  async countSearchResultsOrExcluding(
    orQuery: string,
    excludeIds: string[]
  ): Promise<number> {
    if (!orQuery.trim()) {
      return 0;
    }

    // 除外IDがない場合
    if (excludeIds.length === 0) {
      const result = await this.db
        .prepare(
          `SELECT COUNT(*) as count FROM articles a
           INNER JOIN articles_fts fts ON a.id = fts.id
           WHERE fts.articles_fts MATCH ? AND a.published_at IS NOT NULL AND a.status = ?`
        )
        .bind(orQuery, 'published')
        .first<{ count: number }>();

      return result?.count ?? 0;
    }

    // 除外IDがある場合
    const placeholders = excludeIds.map(() => '?').join(', ');
    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM articles a
         INNER JOIN articles_fts fts ON a.id = fts.id
         WHERE fts.articles_fts MATCH ? AND a.published_at IS NOT NULL AND a.status = ?
         AND a.id NOT IN (${placeholders})`
      )
      .bind(orQuery, 'published', ...excludeIds)
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async getAllCategories(): Promise<Array<{ category: string; count: number }>> {
    const results = await this.db
      .prepare(
        `SELECT category, COUNT(*) as count FROM articles
         WHERE published_at IS NOT NULL AND status = ? AND category IS NOT NULL AND category != ''
         GROUP BY category ORDER BY count DESC`
      )
      .bind('published')
      .all<{ category: string; count: number }>();

    return results.results;
  }

  async getAllTopics(limit: number = 50): Promise<Array<{ topic: string; count: number }>> {
    const results = await this.db
      .prepare(
        `SELECT LOWER(at.topic) as topic, COUNT(*) as count FROM article_topics at
         INNER JOIN articles a ON at.article_id = a.id
         WHERE a.published_at IS NOT NULL AND a.status = ?
         GROUP BY LOWER(at.topic) ORDER BY count DESC LIMIT ?`
      )
      .bind('published', limit)
      .all<{ topic: string; count: number }>();

    return results.results;
  }

  async findByGitHubPath(userId: string, githubPath: string): Promise<Article | null> {
    const result = await this.db
      .prepare('SELECT * FROM articles WHERE user_id = ? AND github_path = ?')
      .bind(userId, githubPath)
      .first<ArticleRow>();

    return result ? this.rowToEntity(result) : null;
  }

  async syncFtsIndex(articleId: string, title: string, summary?: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM articles_fts WHERE id = ?')
      .bind(articleId)
      .run();

    await this.db
      .prepare('INSERT INTO articles_fts (id, title, summary) VALUES (?, ?, ?)')
      .bind(articleId, title, summary ?? '')
      .run();
  }

  async removeFtsIndex(articleId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM articles_fts WHERE id = ?')
      .bind(articleId)
      .run();
  }

  async saveSummary(articleId: string, summary: string): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO article_features (id, article_id, summary, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(article_id) DO UPDATE SET
          summary = excluded.summary,
          updated_at = excluded.updated_at
      `)
      .bind(id, articleId, summary, now, now)
      .run();
  }

  async removeSummary(articleId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM article_features WHERE article_id = ?')
      .bind(articleId)
      .run();
  }
}
