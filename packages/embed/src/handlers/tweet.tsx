import type { Context } from 'hono';
import { TWITTER_CSP } from '../utils/security';
import { TweetEmbed, TweetFallback } from '../components/Tweet';
import { ContentLoader, ErrorMessage } from '../components/Layout';

/**
 * Twitter/X embed handler
 * Uses Twitter's oEmbed API for official embed
 */
export async function tweetHandler(c: Context): Promise<Response> {
  const url = c.req.query('url');

  // If no URL query, return loader that fetches from parent's data-content
  if (!url) {
    return c.html(<ContentLoader embedType="tweet" />);
  }

  const decodedUrl = decodeURIComponent(url);

  // Validate Twitter URL
  if (!isValidTwitterUrl(decodedUrl)) {
    return c.html(<ErrorMessage message="無効なTwitter URLです" />, 400);
  }

  try {
    const oembedData = await fetchTwitterOembed(decodedUrl);
    return c.html(
      <TweetEmbed html={oembedData.html} authorName={oembedData.author_name} />,
      200,
      {
        'Cache-Control': 'public, max-age=3600',
        'Content-Security-Policy': TWITTER_CSP,
      }
    );
  } catch (error) {
    console.error('Failed to fetch tweet oEmbed:', error);
    return c.html(<TweetFallback url={decodedUrl} />, 200, {
      'Cache-Control': 'public, max-age=300',
      'Content-Security-Policy': TWITTER_CSP,
    });
  }
}

interface TwitterOembedResponse {
  html: string;
  author_name: string;
  author_url: string;
  provider_name: string;
  url: string;
}

/**
 * Validate Twitter/X URL
 */
function isValidTwitterUrl(url: string): boolean {
  return /(?:twitter\.com|x\.com)\/\w+\/status\/\d+/i.test(url);
}

/**
 * Fetch oEmbed data from Twitter
 */
async function fetchTwitterOembed(
  tweetUrl: string
): Promise<TwitterOembedResponse> {
  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true&dnt=true`;

  const response = await fetch(oembedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EmbedBot/1.0)',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`oEmbed request failed: ${response.status}`);
  }

  return response.json() as Promise<TwitterOembedResponse>;
}
