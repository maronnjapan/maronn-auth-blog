import type { Context } from 'hono';
import { TWITTER_CSP } from '../utils/security';
import { TweetEmbed } from '../components/Tweet';
import { ContentLoader, ErrorMessage } from '../components/Layout';

/**
 * Twitter/X embed handler
 * Uses official Twitter widgets.js for rendering
 *
 * Reference: https://developer.x.com/en/docs/x-for-websites/javascript-api/guides/set-up-twitter-for-websites
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

  // Extract tweet ID from URL
  const tweetId = extractTweetId(decodedUrl);
  if (!tweetId) {
    return c.html(<ErrorMessage message="ツイートIDを抽出できませんでした" />, 400);
  }

  // Return embed page using official widgets.js
  return c.html(
    <TweetEmbed tweetId={tweetId} tweetUrl={decodedUrl} />,
    200,
    {
      'Cache-Control': 'public, max-age=3600',
      'Content-Security-Policy': TWITTER_CSP,
    }
  );
}

/**
 * Validate Twitter/X URL
 * Supports both twitter.com and x.com domains
 */
function isValidTwitterUrl(url: string): boolean {
  return /(?:twitter\.com|x\.com)\/\w+\/status\/\d+/i.test(url);
}

/**
 * Extract tweet ID from Twitter/X URL
 *
 * Supported formats:
 * - https://twitter.com/user/status/1234567890
 * - https://x.com/user/status/1234567890
 * - https://twitter.com/user/status/1234567890?s=20
 * - https://x.com/user/status/1234567890/photo/1
 *
 * Note: Tweet ID is passed as a String because Twitter IDs are 64-bit integers
 * and JavaScript integers are limited to 53 bits
 */
function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i);
  return match ? match[1] : null;
}
