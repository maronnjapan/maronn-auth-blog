import { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import type { Article } from '../../domain/entities/article';
import { processSearchQuery } from '../../utils/search-normalizer';

export interface SearchArticlesInput {
  query: string;
  page: number;
  limit: number;
}

export type MatchType = 'and' | 'or' | 'topic';

export interface SearchResultItem {
  article: Article;
  matchType: MatchType;
}

export interface SearchArticlesResult {
  andResults: Article[];
  orResults: Article[];
  topicResults: Article[];
  andTotal: number;
  orTotal: number;
  topicTotal: number;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  normalizedTokens: string[];
  isMultiToken: boolean;
  isHashtagSearch: boolean;
  searchedTopics: string[];
}

export class SearchArticlesUsecase {
  constructor(private articleRepo: ArticleRepository) {}

  async execute(input: SearchArticlesInput): Promise<SearchArticlesResult> {
    const { query, page, limit } = input;
    const offset = (page - 1) * limit;

    // クエリを正規化してAND/ORクエリを生成
    const processed = processSearchQuery(query);

    // ハッシュタグ検索の場合はトピック検索を実行
    if (processed.hashtagSearch.isHashtagSearch && processed.hashtagSearch.topics.length > 0) {
      return this.executeTopicSearch(processed.hashtagSearch.topics, page, limit, offset);
    }

    // Escape special FTS5 characters for safety
    const safeAndQuery = this.escapeFtsQuery(processed.andQuery);
    const safeOrQuery = this.escapeFtsQuery(processed.orQuery);

    if (!safeAndQuery.trim()) {
      return this.emptyResult(page, limit, processed.normalizedTokens, processed.isMultiToken);
    }

    // 単一トークンの場合はAND検索のみ（OR検索は意味がない）
    if (!processed.isMultiToken) {
      const [andResults, andTotal] = await Promise.all([
        this.articleRepo.searchByTitleAnd(safeAndQuery, limit, offset),
        this.articleRepo.countSearchResultsAnd(safeAndQuery),
      ]);

      return {
        andResults,
        orResults: [],
        topicResults: [],
        andTotal,
        orTotal: 0,
        topicTotal: 0,
        total: andTotal,
        page,
        limit,
        hasMore: offset + andResults.length < andTotal,
        normalizedTokens: processed.normalizedTokens,
        isMultiToken: false,
        isHashtagSearch: false,
        searchedTopics: [],
      };
    }

    // 複数トークンの場合はAND検索とOR検索を実行
    // まずAND検索で「すべてのワードを含む」記事を取得
    const [andResults, andTotal] = await Promise.all([
      this.articleRepo.searchByTitleAnd(safeAndQuery, limit, offset),
      this.articleRepo.countSearchResultsAnd(safeAndQuery),
    ]);

    // OR検索で「いずれかのワードを含む」記事を取得（AND検索結果を除外）
    // ページネーションの計算: ANDの表示件数を考慮してOR検索のoffsetを調整
    const andDisplayCount = Math.min(andResults.length, limit);
    const orLimit = Math.max(0, limit - andDisplayCount);
    const orOffset = page === 1 ? 0 : Math.max(0, offset - andTotal);

    let orResults: Article[] = [];
    let orTotal = 0;

    if (orLimit > 0 || page > 1) {
      // 全AND結果IDを取得してOR検索から除外する必要がある
      // ただし、パフォーマンスを考慮して、まずは現ページのAND結果IDのみで除外
      // 本格的な実装では全AND結果IDをキャッシュまたは別途取得する必要がある
      const allAndResultIds = await this.getAllAndResultIds(safeAndQuery, andTotal);

      [orResults, orTotal] = await Promise.all([
        this.articleRepo.searchByTitleOrExcluding(
          safeOrQuery,
          allAndResultIds,
          orLimit > 0 ? orLimit : limit,
          orLimit > 0 ? 0 : orOffset
        ),
        this.articleRepo.countSearchResultsOrExcluding(safeOrQuery, allAndResultIds),
      ]);
    }

    const total = andTotal + orTotal;
    const hasMore = offset + andDisplayCount + orResults.length < total;

    return {
      andResults,
      orResults,
      topicResults: [],
      andTotal,
      orTotal,
      topicTotal: 0,
      total,
      page,
      limit,
      hasMore,
      normalizedTokens: processed.normalizedTokens,
      isMultiToken: true,
      isHashtagSearch: false,
      searchedTopics: [],
    };
  }

  private emptyResult(
    page: number,
    limit: number,
    normalizedTokens: string[],
    isMultiToken: boolean
  ): SearchArticlesResult {
    return {
      andResults: [],
      orResults: [],
      topicResults: [],
      andTotal: 0,
      orTotal: 0,
      topicTotal: 0,
      total: 0,
      page,
      limit,
      hasMore: false,
      normalizedTokens,
      isMultiToken,
      isHashtagSearch: false,
      searchedTopics: [],
    };
  }

  private async executeTopicSearch(
    topics: string[],
    page: number,
    limit: number,
    offset: number
  ): Promise<SearchArticlesResult> {
    // 複数トピックの場合、各トピックの記事を取得してマージ
    // 重複を排除しつつ、すべてのトピックに該当する記事を取得
    if (topics.length === 1) {
      const topic = topics[0];
      const [topicResults, topicTotal] = await Promise.all([
        this.articleRepo.findPublishedByTopic(topic, limit, offset),
        this.articleRepo.countPublishedByTopic(topic),
      ]);

      return {
        andResults: [],
        orResults: [],
        topicResults,
        andTotal: 0,
        orTotal: 0,
        topicTotal,
        total: topicTotal,
        page,
        limit,
        hasMore: offset + topicResults.length < topicTotal,
        normalizedTokens: topics,
        isMultiToken: false,
        isHashtagSearch: true,
        searchedTopics: topics,
      };
    }

    // 複数トピック: 各トピックに該当する記事を取得し、重複を排除
    const topicResultsMap = new Map<string, Article>();

    for (const topic of topics) {
      const results = await this.articleRepo.findPublishedByTopic(topic, 1000, 0);
      for (const article of results) {
        if (!topicResultsMap.has(article.id)) {
          topicResultsMap.set(article.id, article);
        }
      }
    }

    const allResults = Array.from(topicResultsMap.values()).sort(
      (a, b) =>
        new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
    );

    const topicTotal = allResults.length;
    const topicResults = allResults.slice(offset, offset + limit);

    return {
      andResults: [],
      orResults: [],
      topicResults,
      andTotal: 0,
      orTotal: 0,
      topicTotal,
      total: topicTotal,
      page,
      limit,
      hasMore: offset + topicResults.length < topicTotal,
      normalizedTokens: topics,
      isMultiToken: topics.length > 1,
      isHashtagSearch: true,
      searchedTopics: topics,
    };
  }

  /**
   * FTS5の特殊文字をエスケープ
   */
  private escapeFtsQuery(query: string): string {
    return query.replace(/[*:^]/g, '');
  }

  /**
   * AND検索の全結果IDを取得（OR検索からの除外用）
   */
  private async getAllAndResultIds(
    safeAndQuery: string,
    andTotal: number
  ): Promise<string[]> {
    if (andTotal === 0) {
      return [];
    }

    // 全AND結果を取得してIDのみ抽出
    // パフォーマンス上の問題がある場合は、上限を設けるか別のアプローチを検討
    const maxFetch = Math.min(andTotal, 1000); // 上限1000件
    const allAndResults = await this.articleRepo.searchByTitleAnd(
      safeAndQuery,
      maxFetch,
      0
    );

    return allAndResults.map((a) => a.id);
  }
}
