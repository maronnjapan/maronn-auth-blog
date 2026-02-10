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

  // Trending page views cache
  async getTrendingPageViews(): Promise<Array<{ path: string; views: number }> | null> {
    const data = await this.kv.get('trending:pageviews', 'json');
    return data as Array<{ path: string; views: number }> | null;
  }

  async setTrendingPageViews(
    pageViews: Array<{ path: string; views: number }>
  ): Promise<void> {
    await this.kv.put('trending:pageviews', JSON.stringify(pageViews), {
      expirationTtl: 2 * 60 * 60, // 2時間（1時間更新の安全マージン）
    });
  }

  async listArticleKeys(): Promise<string[]> {
    const keys: string[] = [];
    let listComplete = false;
    let cursor: string | undefined;

    while (!listComplete) {
      const result = await this.kv.list({ prefix: 'article:', cursor });
      keys.push(...result.keys.map((k) => k.name));
      listComplete = result.list_complete;
      if (!result.list_complete) {
        cursor = result.cursor;
      }
    }

    return keys;
  }
}
