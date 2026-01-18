import { Notification, type NotificationProps } from '../../domain/entities/notification';
import { NotificationType } from '../../domain/value-objects/notification-type';
import type { NotificationType as NotificationTypeValue } from '@maronn-auth-blog/shared';

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationTypeValue;
  article_id: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

export class NotificationRepository {
  constructor(private db: D1Database) {}

  private rowToEntity(row: NotificationRow): Notification {
    const props: NotificationProps = {
      id: row.id,
      userId: row.user_id,
      type: NotificationType.fromString(row.type),
      articleId: row.article_id ?? undefined,
      message: row.message,
      readAt: row.read_at ? new Date(row.read_at) : undefined,
      createdAt: new Date(row.created_at),
    };
    return new Notification(props);
  }

  async findById(id: string): Promise<Notification | null> {
    const result = await this.db
      .prepare('SELECT * FROM notifications WHERE id = ?')
      .bind(id)
      .first<NotificationRow>();

    return result ? this.rowToEntity(result) : null;
  }

  async findByUserId(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Notification[]> {
    const results = await this.db
      .prepare(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      )
      .bind(userId, limit, offset)
      .all<NotificationRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  async countByUserId(userId: string): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?')
      .bind(userId)
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const result = await this.db
      .prepare(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL'
      )
      .bind(userId)
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async save(notification: Notification): Promise<void> {
    const json = notification.toJSON();

    await this.db
      .prepare(`
        INSERT INTO notifications (
          id, user_id, type, article_id, message, read_at, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          read_at = excluded.read_at
      `)
      .bind(
        json.id,
        json.userId,
        json.type,
        json.articleId ?? null,
        json.message,
        json.readAt ?? null,
        json.createdAt
      )
      .run();
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?')
      .bind(now, id, userId)
      .run();
  }

  async markAllAsRead(userId: string): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL')
      .bind(now, userId)
      .run();
  }

  async delete(id: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM notifications WHERE id = ?')
      .bind(id)
      .run();
  }
}
