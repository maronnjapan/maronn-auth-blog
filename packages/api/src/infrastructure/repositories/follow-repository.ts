import { Follow, type FollowProps } from '../../domain/entities/follow';

interface FollowRow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export class FollowRepository {
  constructor(private db: D1Database) {}

  private rowToEntity(row: FollowRow): Follow {
    const props: FollowProps = {
      id: row.id,
      followerId: row.follower_id,
      followingId: row.following_id,
      createdAt: new Date(row.created_at),
    };
    return new Follow(props);
  }

  async follow(followerId: string, followingId: string): Promise<Follow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        'INSERT INTO follows (id, follower_id, following_id, created_at) VALUES (?, ?, ?, ?)'
      )
      .bind(id, followerId, followingId, now)
      .run();

    return new Follow({
      id,
      followerId,
      followingId,
      createdAt: new Date(now),
    });
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?')
      .bind(followerId, followingId)
      .run();
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?'
      )
      .bind(followerId, followingId)
      .first<{ '1': number }>();

    return result !== null;
  }

  async getFollowers(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Follow[]> {
    const results = await this.db
      .prepare(
        'SELECT * FROM follows WHERE following_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      )
      .bind(userId, limit, offset)
      .all<FollowRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  async getFollowing(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Follow[]> {
    const results = await this.db
      .prepare(
        'SELECT * FROM follows WHERE follower_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      )
      .bind(userId, limit, offset)
      .all<FollowRow>();

    return results.results.map((row) => this.rowToEntity(row));
  }

  async countFollowers(userId: string): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?')
      .bind(userId)
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async countFollowing(userId: string): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?')
      .bind(userId)
      .first<{ count: number }>();

    return result?.count ?? 0;
  }

  async getFollowerIds(userId: string): Promise<string[]> {
    const results = await this.db
      .prepare('SELECT follower_id FROM follows WHERE following_id = ?')
      .bind(userId)
      .all<{ follower_id: string }>();

    return results.results.map((row) => row.follower_id);
  }
}
