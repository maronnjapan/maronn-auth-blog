import { KVClient } from '../../infrastructure/storage/kv-client';

export interface StaleSessionCleanupResult {
  totalSessions: number;
  deletedSessions: number;
}

export class CleanupStaleSessionsUsecase {
  constructor(private kvClient: KVClient) {}

  async execute(): Promise<StaleSessionCleanupResult> {
    console.info('[CleanupStaleSessions] Starting stale session cleanup');

    const sessions = await this.kvClient.listSessionKeys();
    const result: StaleSessionCleanupResult = {
      totalSessions: sessions.length,
      deletedSessions: 0,
    };

    // Group sessions by userId
    const sessionsByUser = new Map<
      string,
      Array<{ sessionId: string; expiresAt: number }>
    >();

    for (const session of sessions) {
      let userId: string | undefined;
      let expiresAt: number | undefined;

      if (session.metadata) {
        userId = session.metadata.userId;
        expiresAt = session.metadata.expiresAt;
      } else {
        // Fallback: read session data if metadata is missing (backward compatibility)
        const data = await this.kvClient.getSession(session.sessionId);
        if (!data) continue;
        userId = data.userId;
        expiresAt = data.expiresAt;
      }

      if (!userId) continue;

      const userSessions = sessionsByUser.get(userId) ?? [];
      userSessions.push({
        sessionId: session.sessionId,
        expiresAt: expiresAt ?? 0,
      });
      sessionsByUser.set(userId, userSessions);
    }

    // For each user, keep the latest session and delete the rest
    for (const [userId, userSessions] of sessionsByUser) {
      if (userSessions.length <= 1) continue;

      // Sort by expiresAt descending (latest first)
      userSessions.sort((a, b) => b.expiresAt - a.expiresAt);

      // Delete all but the first (latest)
      for (let i = 1; i < userSessions.length; i++) {
        await this.kvClient.deleteSession(userSessions[i].sessionId);
        result.deletedSessions++;
        console.info(
          `[CleanupStaleSessions] Deleted stale session: ${userSessions[i].sessionId} for user: ${userId}`
        );
      }
    }

    console.info(
      `[CleanupStaleSessions] Cleanup completed: total=${result.totalSessions}, deleted=${result.deletedSessions}`
    );

    return result;
  }
}
