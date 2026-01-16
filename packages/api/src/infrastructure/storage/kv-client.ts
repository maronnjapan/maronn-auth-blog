export interface SessionData {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  idToken: string;
  expiresAt: number;
}

export class KVClient {
  constructor(private kv: KVNamespace) {}

  // Session management
  async getSession(sessionId: string): Promise<SessionData | null> {
    const data = await this.kv.get(`session:${sessionId}`, 'json');
    return data as SessionData | null;
  }

  async setSession(
    sessionId: string,
    data: SessionData,
    ttl: number = 90 * 24 * 60 * 60 // 90 days
  ): Promise<void> {
    await this.kv.put(`session:${sessionId}`, JSON.stringify(data), {
      expirationTtl: ttl,
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.kv.delete(`session:${sessionId}`);
  }

  // Article HTML cache
  async getArticleHtml(userId: string, slug: string): Promise<string | null> {
    return await this.kv.get(`article:${userId}:${slug}`);
  }

  async setArticleHtml(userId: string, slug: string, html: string): Promise<void> {
    await this.kv.put(`article:${userId}:${slug}`, html);
  }

  async deleteArticleHtml(userId: string, slug: string): Promise<void> {
    await this.kv.delete(`article:${userId}:${slug}`);
  }
}
