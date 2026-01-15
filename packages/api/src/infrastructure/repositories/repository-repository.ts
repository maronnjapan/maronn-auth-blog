interface RepositoryRow {
  id: string;
  user_id: string;
  github_repo_full_name: string;
  created_at: string;
}

export class RepositoryRepository {
  constructor(private db: D1Database) {}

  async findByUserId(userId: string): Promise<RepositoryRow | null> {
    const result = await this.db
      .prepare('SELECT * FROM repositories WHERE user_id = ?')
      .bind(userId)
      .first<RepositoryRow>();

    return result;
  }

  async save(userId: string, githubRepoFullName: string): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO repositories (id, user_id, github_repo_full_name, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          github_repo_full_name = excluded.github_repo_full_name
      `)
      .bind(id, userId, githubRepoFullName, now)
      .run();
  }

  async delete(userId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM repositories WHERE user_id = ?')
      .bind(userId)
      .run();
  }
}
