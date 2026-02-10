import { CloudflareAnalyticsClient } from '../../infrastructure/cloudflare-analytics-client';
import type { KVClient } from '../../infrastructure/storage/kv-client';

export class RefreshTrendingPageviewsUsecase {
  constructor(
    private analyticsClient: CloudflareAnalyticsClient,
    private kvClient: KVClient
  ) {}

  async execute(webHost: string): Promise<void> {
    console.info('[RefreshTrendingPageviews] Starting page view refresh');

    const pageViews = await this.analyticsClient.getArticlePageViews(webHost, 7, 50);

    if (pageViews.length === 0) {
      console.info('[RefreshTrendingPageviews] No page view data returned from Analytics API');
      return;
    }

    await this.kvClient.setTrendingPageViews(pageViews);

    console.info(
      `[RefreshTrendingPageviews] Cached ${pageViews.length} page view entries to KV`
    );
  }
}
