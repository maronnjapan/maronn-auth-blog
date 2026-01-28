import { Comment, type CommentProps } from '../../domain/entities/comment';

interface CommentRow {
  id: string;
  article_id: string;
  user_id: string;
  body_markdown: string;
  body_html: string;
  created_at: string;
  updated_at: string;
}

export class CommentRepository {
  constructor(private db: D1Database) {}

  private rowToEntity(row: CommentRow): Comment {
    const props: CommentProps = {
      id: row.id,
      articleId: row.article_id,
      userId: row.user_id,
      bodyMarkdown: row.body_markdown,
      bodyHtml: row.body_html,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
    return new Comment(props);
  }

  async findById(id: string): Promise<Comment | null> {
    const result = await this.db
      .prepare('SELECT * FROM comments WHERE id = ?')
      .bind(id)
      .first<CommentRow>();

    return result ? this.rowToEntity(result) : null;
  }

  async findByArticleId(
    articleId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Comment[]> {
    const results = await this.db
      .prepare(
        'SELECT * FROM comments WHERE article_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?'
      )
      .bind(articleId, limit, offset)
      .all<CommentRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  async countByArticleId(articleId: string): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM comments WHERE article_id = ?')
      .bind(articleId)
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async save(comment: Comment): Promise<void> {
    const json = comment.toJSON();

    await this.db
      .prepare(`
        INSERT INTO comments (
          id, article_id, user_id, body_markdown, body_html, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          body_markdown = excluded.body_markdown,
          body_html = excluded.body_html,
          updated_at = excluded.updated_at
      `)
      .bind(
        json.id,
        json.articleId,
        json.userId,
        json.bodyMarkdown,
        json.bodyHtml,
        json.createdAt,
        json.updatedAt
      )
      .run();
  }

  async delete(id: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM comments WHERE id = ?')
      .bind(id)
      .run();
  }

  async saveImage(commentId: string, filename: string): Promise<void> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        'INSERT INTO comment_images (id, comment_id, filename) VALUES (?, ?, ?)'
      )
      .bind(id, commentId, filename)
      .run();
  }

  async findImagesByCommentId(commentId: string): Promise<string[]> {
    const results = await this.db
      .prepare('SELECT filename FROM comment_images WHERE comment_id = ?')
      .bind(commentId)
      .all<{ filename: string }>();

    return results.results.map((row) => row.filename);
  }
}
