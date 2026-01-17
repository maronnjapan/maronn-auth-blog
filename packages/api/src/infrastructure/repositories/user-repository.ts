import { User, type UserProps } from '../../domain/entities/user';
import type { UserRole } from '@maronn-auth-blog/shared';

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  icon_url: string | null;
  bio: string | null;
  github_user_id: string;
  github_installation_id: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export class UserRepository {
  constructor(private db: D1Database) {}

  private rowToEntity(row: UserRow): User {
    const props: UserProps = {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      iconUrl: row.icon_url ?? undefined,
      bio: row.bio ?? undefined,
      githubUserId: row.github_user_id,
      githubInstallationId: row.github_installation_id ?? undefined,
      role: row.role,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
    return new User(props);
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<UserRow>();

    return result ? this.rowToEntity(result) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE username = ?')
      .bind(username)
      .first<UserRow>();

    return result ? this.rowToEntity(result) : null;
  }

  async findByGitHubUserId(githubUserId: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE github_user_id = ?')
      .bind(githubUserId)
      .first<UserRow>();

    return result ? this.rowToEntity(result) : null;
  }

  async save(user: User): Promise<void> {
    const json = user.toJSON();

    await this.db
      .prepare(`
        INSERT INTO users (
          id, username, display_name, icon_url, bio,
          github_user_id, github_installation_id, role,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          username = excluded.username,
          display_name = excluded.display_name,
          icon_url = excluded.icon_url,
          bio = excluded.bio,
          github_installation_id = excluded.github_installation_id,
          role = excluded.role,
          updated_at = excluded.updated_at
      `)
      .bind(
        json.id,
        json.username,
        json.displayName,
        json.iconUrl ?? null,
        json.bio ?? null,
        json.githubUserId,
        json.githubInstallationId ?? null,
        json.role,
        json.createdAt,
        json.updatedAt
      )
      .run();
  }
}
