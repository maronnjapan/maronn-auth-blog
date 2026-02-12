interface BookmarkRow {
  id: string;
  user_id: string;
  article_id: string;
  created_at: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  articleId: string;
  createdAt: string;
}

export class BookmarkRepository {
  constructor(private db: D1Database) {}

  private rowToBookmark(row: BookmarkRow): Bookmark {
    return {
      id: row.id,
      userId: row.user_id,
      articleId: row.article_id,
      createdAt: row.created_at,
    };
  }

  async add(userId: string, articleId: string): Promise<Bookmark> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        'INSERT INTO bookmarks (id, user_id, article_id, created_at) VALUES (?, ?, ?, ?)'
      )
      .bind(id, userId, articleId, now)
      .run();

    return { id, userId, articleId, createdAt: now };
  }

  async remove(userId: string, articleId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM bookmarks WHERE user_id = ? AND article_id = ?')
      .bind(userId, articleId)
      .run();
  }

  async exists(userId: string, articleId: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        'SELECT 1 FROM bookmarks WHERE user_id = ? AND article_id = ?'
      )
      .bind(userId, articleId)
      .first<{ '1': number }>();

    return result !== null;
  }

  async findByUserId(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Bookmark[]> {
    const results = await this.db
      .prepare(
        'SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      )
      .bind(userId, limit, offset)
      .all<BookmarkRow>();

    return results.results.map((row) => this.rowToBookmark(row));
  }

  async countByUserId(userId: string): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?')
      .bind(userId)
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async countByArticleId(articleId: string): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM bookmarks WHERE article_id = ?')
      .bind(articleId)
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async findArticleIdsByUserId(userId: string): Promise<string[]> {
    const results = await this.db
      .prepare('SELECT article_id FROM bookmarks WHERE user_id = ?')
      .bind(userId)
      .all<{ article_id: string }>();

    return results.results.map((row) => row.article_id);
  }
}
