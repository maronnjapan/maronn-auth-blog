export interface SessionData {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  idToken: string;
  expiresAt: number;
  permissions?: string[];
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

  // Article Markdown cache
  async getArticleMarkdown(userId: string, slug: string): Promise<string | null> {
    return await this.kv.get(`article:${userId}:${slug}`);
  }

  async setArticleMarkdown(userId: string, slug: string, markdown: string): Promise<void> {
    await this.kv.put(`article:${userId}:${slug}`, markdown);
  }

  async deleteArticleMarkdown(userId: string, slug: string): Promise<void> {
    await this.kv.delete(`article:${userId}:${slug}`);
  }

  async listArticleKeys(): Promise<string[]> {
    const keys: string[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.kv.list({ prefix: 'article:', cursor });
      keys.push(...result.keys.map((k) => k.name));
      cursor = result.list_complete ? undefined : result.cursor;
    } while (cursor);

    return keys;
  }
}
