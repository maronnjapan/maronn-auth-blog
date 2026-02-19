import {
  NotificationSettings,
  type NotificationSettingsProps,
} from '../../domain/entities/notification-settings';

interface NotificationSettingsRow {
  id: string;
  user_id: string;
  email_notifications: number;
  created_at: string;
  updated_at: string;
}

export class NotificationSettingsRepository {
  constructor(private db: D1Database) {}

  private rowToEntity(row: NotificationSettingsRow): NotificationSettings {
    const props: NotificationSettingsProps = {
      id: row.id,
      userId: row.user_id,
      emailNotifications: row.email_notifications === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
    return new NotificationSettings(props);
  }

  async findByUserId(userId: string): Promise<NotificationSettings | null> {
    const result = await this.db
      .prepare('SELECT * FROM notification_settings WHERE user_id = ?')
      .bind(userId)
      .first<NotificationSettingsRow>();

    return result ? this.rowToEntity(result) : null;
  }

  async save(settings: NotificationSettings): Promise<void> {
    const json = settings.toJSON();

    await this.db
      .prepare(`
        INSERT INTO notification_settings (
          id, user_id, email_notifications, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          email_notifications = excluded.email_notifications,
          updated_at = excluded.updated_at
      `)
      .bind(
        json.id,
        json.userId,
        json.emailNotifications ? 1 : 0,
        json.createdAt,
        json.updatedAt
      )
      .run();
  }

  async getOrCreate(userId: string): Promise<NotificationSettings> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const now = new Date();
    const settings = new NotificationSettings({
      id: crypto.randomUUID(),
      userId,
      emailNotifications: false,
      createdAt: now,
      updatedAt: now,
    });

    await this.save(settings);
    return settings;
  }
}
