import type { Context } from 'hono';
import { createEmbedHtml, createErrorHtml, escapeHtml } from '../utils/html-template';
import { createEmbedPageHtml } from '../utils/embed-page';

/**
 * Tweet page handler - returns HTML page that loads tweet via JavaScript
 */
export function tweetPageHandler(c: Context): Response {
  const html = createEmbedPageHtml({
    type: 'tweet',
    apiEndpoint: '/api/tweet',
  });
  return c.html(html);
}

interface TweetData {
  id: string;
  text: string;
  author: {
    name: string;
    username: string;
    profileImageUrl: string;
  };
  createdAt: string;
  media?: {
    type: 'photo' | 'video';
    url: string;
  }[];
}

/**
 * Twitter/X embed handler
 * Uses Twitter's oEmbed API or syndication API
 */
export async function tweetHandler(c: Context): Promise<Response> {
  const url = c.req.query('url');

  if (!url) {
    return c.html(createErrorHtml('URLが指定されていません'), 400);
  }

  const decodedUrl = decodeURIComponent(url);

  // Extract tweet ID from URL
  const tweetId = extractTweetId(decodedUrl);
  if (!tweetId) {
    return c.html(createErrorHtml('無効なTwitter URLです'), 400);
  }

  try {
    // Use Twitter's syndication API (no auth required)
    const tweetData = await fetchTweetFromSyndication(tweetId);
    const html = renderTweet(tweetData, decodedUrl);
    return c.html(html, 200, {
      'Cache-Control': 'public, max-age=3600',
    });
  } catch (error) {
    console.error('Failed to fetch tweet:', error);
    // Fallback to simple link card
    return c.html(createFallbackTweet(decodedUrl, tweetId), 200, {
      'Cache-Control': 'public, max-age=300',
    });
  }
}

/**
 * Extract tweet ID from Twitter/X URL
 */
function extractTweetId(url: string): string | null {
  // Match patterns like:
  // https://twitter.com/user/status/123456789
  // https://x.com/user/status/123456789
  // https://mobile.twitter.com/user/status/123456789
  const match = url.match(
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i
  );
  return match ? match[1] : null;
}

/**
 * Fetch tweet data from Twitter's syndication API
 */
async function fetchTweetFromSyndication(tweetId: string): Promise<TweetData> {
  // Use Twitter's syndication endpoint (used by embedded tweets)
  const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=x`;

  const response = await fetch(syndicationUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EmbedBot/1.0)',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tweet: ${response.status}`);
  }

  const data = await response.json() as any;

  if (!data || data.errors) {
    throw new Error('Tweet not found or unavailable');
  }

  return {
    id: tweetId,
    text: data.text || '',
    author: {
      name: data.user?.name || 'Unknown',
      username: data.user?.screen_name || 'unknown',
      profileImageUrl: data.user?.profile_image_url_https || '',
    },
    createdAt: data.created_at || '',
    media: extractMedia(data),
  };
}

/**
 * Extract media from tweet data
 */
function extractMedia(data: any): TweetData['media'] {
  const media: TweetData['media'] = [];

  if (data.photos) {
    for (const photo of data.photos) {
      media.push({
        type: 'photo',
        url: photo.url || '',
      });
    }
  }

  if (data.video) {
    media.push({
      type: 'video',
      url: data.video.poster || '',
    });
  }

  return media.length > 0 ? media : undefined;
}

/**
 * Render tweet as HTML
 */
function renderTweet(tweet: TweetData, originalUrl: string): string {
  const formattedDate = formatDate(tweet.createdAt);

  const mediaHtml = tweet.media
    ? `<div class="tweet-media">
        ${tweet.media
          .map((m) =>
            m.type === 'photo'
              ? `<img src="${escapeHtml(m.url)}" alt="Tweet media" loading="lazy">`
              : `<div class="video-placeholder">動画</div>`
          )
          .join('')}
      </div>`
    : '';

  const content = `
    <a href="${escapeHtml(originalUrl)}" target="_blank" rel="noopener noreferrer" class="tweet-link">
      <div class="tweet">
        <div class="tweet-header">
          <img
            src="${escapeHtml(tweet.author.profileImageUrl)}"
            alt="${escapeHtml(tweet.author.name)}"
            class="avatar"
            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><rect fill=%22%23ccc%22 width=%2248%22 height=%2248%22 rx=%2224%22/></svg>'"
          >
          <div class="author-info">
            <span class="author-name">${escapeHtml(tweet.author.name)}</span>
            <span class="author-username">@${escapeHtml(tweet.author.username)}</span>
          </div>
          <svg class="x-logo" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>
        <div class="tweet-text">${formatTweetText(tweet.text)}</div>
        ${mediaHtml}
        <div class="tweet-footer">
          <span class="tweet-date">${escapeHtml(formattedDate)}</span>
        </div>
      </div>
    </a>
  `;

  return createEmbedHtml({
    content,
    title: `@${tweet.author.username}のポスト`,
    styles: `
      .tweet-link {
        text-decoration: none;
        color: inherit;
        display: block;
      }
      .tweet {
        border: 1px solid #e1e8ed;
        border-radius: 16px;
        padding: 16px;
        background: #fff;
        max-width: 550px;
        transition: background-color 0.2s;
      }
      .tweet:hover {
        background: #f7f9fa;
      }
      .tweet-header {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
      }
      .avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        margin-right: 12px;
      }
      .author-info {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .author-name {
        font-weight: 700;
        color: #0f1419;
      }
      .author-username {
        color: #536471;
        font-size: 14px;
      }
      .x-logo {
        color: #0f1419;
      }
      .tweet-text {
        font-size: 15px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
        color: #0f1419;
      }
      .tweet-text a {
        color: #1d9bf0;
        text-decoration: none;
      }
      .tweet-text a:hover {
        text-decoration: underline;
      }
      .tweet-media {
        margin-top: 12px;
        border-radius: 16px;
        overflow: hidden;
      }
      .tweet-media img {
        width: 100%;
        display: block;
      }
      .video-placeholder {
        background: #e1e8ed;
        padding: 40px;
        text-align: center;
        color: #536471;
      }
      .tweet-footer {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e1e8ed;
      }
      .tweet-date {
        color: #536471;
        font-size: 14px;
      }
    `,
  });
}

/**
 * Create fallback tweet card when API fails
 */
function createFallbackTweet(url: string, tweetId: string): string {
  const content = `
    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="tweet-link">
      <div class="tweet fallback">
        <div class="tweet-header">
          <svg class="x-logo" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span class="view-text">ポストを表示</span>
        </div>
        <div class="tweet-id">Tweet ID: ${escapeHtml(tweetId)}</div>
      </div>
    </a>
  `;

  return createEmbedHtml({
    content,
    title: 'X Post',
    styles: `
      .tweet-link {
        text-decoration: none;
        color: inherit;
        display: block;
      }
      .tweet.fallback {
        border: 1px solid #e1e8ed;
        border-radius: 16px;
        padding: 20px;
        background: #fff;
        max-width: 550px;
        text-align: center;
      }
      .tweet.fallback:hover {
        background: #f7f9fa;
      }
      .tweet-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .x-logo {
        color: #0f1419;
      }
      .view-text {
        font-weight: 600;
        color: #0f1419;
      }
      .tweet-id {
        color: #536471;
        font-size: 12px;
      }
    `,
  });
}

/**
 * Format tweet text with links, hashtags, and mentions
 */
function formatTweetText(text: string): string {
  let formatted = escapeHtml(text);

  // Convert URLs to links
  formatted = formatted.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Convert hashtags
  formatted = formatted.replace(
    /#(\w+)/g,
    '<a href="https://twitter.com/hashtag/$1" target="_blank" rel="noopener noreferrer">#$1</a>'
  );

  // Convert mentions
  formatted = formatted.replace(
    /@(\w+)/g,
    '<a href="https://twitter.com/$1" target="_blank" rel="noopener noreferrer">@$1</a>'
  );

  return formatted;
}

/**
 * Format date string
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
