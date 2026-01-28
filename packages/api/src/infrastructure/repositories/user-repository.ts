import { User, type UserProps } from '../../domain/entities/user';

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  icon_url: string | null;
  bio: string | null;
  github_user_id: string;
  github_installation_id: string | null;
  github_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  totalArticles: number;
  publishedArticles: number;
  pendingArticles: number;
  rejectedArticles: number;
}

export class UserRepository {
  constructor(private db: D1Database) {}

  private rowToEntity(row: UserRow): User {
    const props: UserProps = {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      email: row.email ?? undefined,
      iconUrl: row.icon_url ?? undefined,
      bio: row.bio ?? undefined,
      githubUserId: row.github_user_id,
      githubInstallationId: row.github_installation_id ?? undefined,
      githubUrl: row.github_url ?? undefined,
      twitterUrl: row.twitter_url ?? undefined,
      websiteUrl: row.website_url ?? undefined,
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
          id, username, display_name, email, icon_url, bio,
          github_user_id, github_installation_id,
          github_url, twitter_url, website_url,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          username = excluded.username,
          display_name = excluded.display_name,
          email = excluded.email,
          icon_url = excluded.icon_url,
          bio = excluded.bio,
          github_installation_id = excluded.github_installation_id,
          github_url = excluded.github_url,
          twitter_url = excluded.twitter_url,
          website_url = excluded.website_url,
          updated_at = excluded.updated_at
      `)
      .bind(
        json.id,
        json.username,
        json.displayName,
        json.email ?? null,
        json.iconUrl ?? null,
        json.bio ?? null,
        json.githubUserId,
        json.githubInstallationId ?? null,
        json.githubUrl ?? null,
        json.twitterUrl ?? null,
        json.websiteUrl ?? null,
        json.createdAt,
        json.updatedAt
      )
      .run();
  }

  async getArticleStats(userId: string): Promise<UserStats> {
    const result = await this.db
      .prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
          SUM(CASE WHEN status IN ('pending_new', 'pending_update') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM articles WHERE user_id = ? AND status != 'deleted'
      `)
      .bind(userId)
      .first<{
        total: number;
        published: number;
        pending: number;
        rejected: number;
      }>();

    return {
      totalArticles: result?.total ?? 0,
      publishedArticles: result?.published ?? 0,
      pendingArticles: result?.pending ?? 0,
      rejectedArticles: result?.rejected ?? 0,
    };
  }
}
