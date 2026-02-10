import type { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import type { UserRepository } from '../../infrastructure/repositories/user-repository';
import type { KVClient } from '../../infrastructure/storage/kv-client';
import type { Article } from '../../domain/entities/article';

export interface TrendingArticleResult {
  article: Article;
  views: number;
}

interface GetTrendingArticlesInput {
  limit?: number;
  topics?: string[];
  excludeArticleId?: string;
}

/** /{username}/articles/{slug} 形式のパスからusernameとslugを抽出 */
function parseArticlePath(path: string): { username: string; slug: string } | null {
  const match = path.match(/^\/([^/]+)\/articles\/([^/]+)\/?$/);
  if (!match) return null;
  return { username: match[1], slug: match[2] };
}

export class GetTrendingArticlesUsecase {
  constructor(
    private kvClient: KVClient,
    private articleRepo: ArticleRepository,
    private userRepo: UserRepository
  ) {}

  async execute(
    input: GetTrendingArticlesInput = {}
  ): Promise<TrendingArticleResult[]> {
    const { limit = 5, topics, excludeArticleId } = input;

    // 1. KV からキャッシュされたページビューデータを取得
    const pageViews = await this.kvClient.getTrendingPageViews();

    if (!pageViews || pageViews.length === 0) {
      return [];
    }

    // 2. パスから username+slug を抽出
    const parsedViews = pageViews
      .map((pv) => {
        const parsed = parseArticlePath(pv.path);
        if (!parsed) return null;
        return { ...parsed, views: pv.views };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (parsedViews.length === 0) {
      return [];
    }

    // 3. ユニークなusernameからユーザーを取得
    const uniqueUsernames = [...new Set(parsedViews.map((v) => v.username))];
    const userMap = new Map<string, string>(); // username -> userId

    await Promise.all(
      uniqueUsernames.map(async (username) => {
        const user = await this.userRepo.findByUsername(username);
        if (user) {
          userMap.set(username, user.id);
        }
      })
    );

    // 4. 記事を取得してビュー数と紐付け
    const results: TrendingArticleResult[] = [];

    for (const pv of parsedViews) {
      const userId = userMap.get(pv.username);
      if (!userId) continue;

      const article = await this.articleRepo.findByUserIdAndSlug(userId, pv.slug);
      if (!article) continue;

      // 公開済み記事のみ
      if (!article.publishedAt || article.status.toString() === 'deleted') continue;

      // 除外指定された記事はスキップ
      if (excludeArticleId && article.id === excludeArticleId) continue;

      results.push({ article, views: pv.views });
    }

    // 5. トピックでフィルタ（指定された場合）
    let filtered = results;
    if (topics && topics.length > 0) {
      const topicSet = new Set(topics.map((t) => t.toLowerCase()));
      const withTopics = await Promise.all(
        results.map(async (r) => {
          const articleTopics = await this.articleRepo.findTopics(r.article.id);
          const hasMatchingTopic = articleTopics.some((t) => topicSet.has(t.toLowerCase()));
          return hasMatchingTopic ? r : null;
        })
      );
      filtered = withTopics.filter((r): r is TrendingArticleResult => r !== null);
    }

    // 6. ビュー数でソートしてlimitまで返す
    return filtered
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }
}
