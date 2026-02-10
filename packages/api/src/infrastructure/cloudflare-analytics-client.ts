export interface PageViewData {
  path: string;
  views: number;
}

interface GraphQLResponse {
  data?: {
    viewer: {
      zones: Array<{
        httpRequestsAdaptiveGroups: Array<{
          count: number;
          dimensions: {
            clientRequestPath: string;
          };
        }>;
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

export class CloudflareAnalyticsClient {
  private static readonly GRAPHQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';

  constructor(
    private apiToken: string,
    private zoneId: string
  ) {}

  async getArticlePageViews(
    webHost: string,
    days: number = 7,
    limit: number = 50
  ): Promise<PageViewData[]> {
    const now = new Date();
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const query = `
      query GetArticlePageViews($zoneTag: string!, $since: DateTime!, $until: DateTime!, $host: string!, $limit: Int!) {
        viewer {
          zones(filter: {zoneTag: $zoneTag}) {
            httpRequestsAdaptiveGroups(
              filter: {
                datetime_geq: $since
                datetime_lt: $until
                clientRequestHTTPHost: $host
                clientRequestHTTPMethodName: "GET"
                edgeResponseStatus: 200
                clientRequestPath_like: "%/articles/%"
              }
              orderBy: [count_DESC]
              limit: $limit
            ) {
              count
              dimensions {
                clientRequestPath
              }
            }
          }
        }
      }
    `;

    const response = await fetch(CloudflareAnalyticsClient.GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          zoneTag: this.zoneId,
          since: since.toISOString(),
          until: now.toISOString(),
          host: webHost,
          limit,
        },
      }),
    });

    if (!response.ok) {
      console.error(`[CloudflareAnalytics] HTTP error: ${response.status}`);
      return [];
    }

    const result = (await response.json()) as GraphQLResponse;

    if (result.errors && result.errors.length > 0) {
      console.error('[CloudflareAnalytics] GraphQL errors:', result.errors);
      return [];
    }

    const groups = result.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups;
    if (!groups) {
      return [];
    }

    return groups.map((group) => ({
      path: group.dimensions.clientRequestPath,
      views: group.count,
    }));
  }
}
