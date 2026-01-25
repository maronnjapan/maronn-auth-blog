import type { Context } from 'hono';
import { TWITTER_CSP } from '../utils/security';
import { TweetCard, TweetFallback } from '../components/Tweet';
import { ContentLoader, ErrorMessage } from '../components/Layout';

/**
 * Twitter/X embed handler
 * Uses Twitter's oEmbed API and renders a Zenn-style card
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
    const tweetData = parseOembedHtml(oembedData, decodedUrl);

    return c.html(
      <TweetCard tweet={tweetData} />,
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

interface TweetData {
  text: string;
  authorName: string;
  authorHandle: string;
  authorUrl: string;
  tweetUrl: string;
  date: string;
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

/**
 * Parse oEmbed HTML to extract tweet data
 * oEmbed HTML format example:
 * <blockquote class="twitter-tweet"><p lang="ja" dir="ltr">Tweet text</p>
 * &mdash; Author Name (@handle) <a href="https://twitter.com/handle/status/123">September 1, 2023</a></blockquote>
 */
function parseOembedHtml(oembed: TwitterOembedResponse, originalUrl: string): TweetData {
  const html = oembed.html;

  // Extract tweet text from <p> tag
  const textMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  let text = textMatch ? textMatch[1] : '';

  // Clean up HTML entities and tags in text
  text = decodeHtmlEntities(text);
  text = text.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1'); // Remove link tags but keep text
  text = text.replace(/<br\s*\/?>/gi, '\n'); // Convert br to newline
  text = text.replace(/<[^>]+>/g, ''); // Remove remaining tags
  text = text.trim();

  // Extract handle from author_url
  const handleMatch = oembed.author_url.match(/(?:twitter\.com|x\.com)\/(\w+)/i);
  const authorHandle = handleMatch ? handleMatch[1] : '';

  // Extract date from the link text
  const dateMatch = html.match(/<a[^>]*>([A-Za-z]+ \d{1,2}, \d{4})<\/a>/i);
  let date = dateMatch ? dateMatch[1] : '';

  // If no date found, try alternative formats
  if (!date) {
    const altDateMatch = html.match(/>\s*([A-Za-z]+ \d{1,2}, \d{4})\s*</);
    date = altDateMatch ? altDateMatch[1] : '';
  }

  return {
    text,
    authorName: oembed.author_name,
    authorHandle,
    authorUrl: oembed.author_url,
    tweetUrl: originalUrl,
    date,
  };
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '\u2026',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&ldquo;': '\u201c',
    '&rdquo;': '\u201d',
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));

  return result;
}
