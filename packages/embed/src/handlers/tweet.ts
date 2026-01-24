import type { Context } from 'hono';
import { createEmbedPageHtml } from '../utils/embed-page';
import { escapeHtml } from '../utils/html-template';

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

/**
 * Twitter/X embed handler
 * Uses Twitter's oEmbed API for official embed
 */
export async function tweetHandler(c: Context): Promise<Response> {
  const url = c.req.query('url');

  if (!url) {
    return c.html(createErrorHtml('URLが指定されていません'), 400);
  }

  const decodedUrl = decodeURIComponent(url);

  // Validate Twitter URL
  if (!isValidTwitterUrl(decodedUrl)) {
    return c.html(createErrorHtml('無効なTwitter URLです'), 400);
  }

  try {
    // Use Twitter's oEmbed API for official embed
    const oembedData = await fetchTwitterOembed(decodedUrl);
    const html = renderOfficialTweet(oembedData);
    return c.html(html, 200, {
      'Cache-Control': 'public, max-age=3600',
    });
  } catch (error) {
    console.error('Failed to fetch tweet oEmbed:', error);
    return c.html(createFallbackTweet(decodedUrl), 200, {
      'Cache-Control': 'public, max-age=300',
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
async function fetchTwitterOembed(tweetUrl: string): Promise<TwitterOembedResponse> {
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
 * Render official Twitter embed
 */
function renderOfficialTweet(oembed: TwitterOembedResponse): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tweet by ${escapeHtml(oembed.author_name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: transparent; }
    .twitter-tweet { margin: 0 !important; }
  </style>
</head>
<body>
  ${oembed.html}
  <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
  <script>
    (function() {
      function sendHeight() {
        var height = document.body.scrollHeight;
        var id = window.location.hash.slice(1);
        if (id && window.parent !== window) {
          window.parent.postMessage({ id: id, height: height }, '*');
        }
      }

      // Wait for Twitter widget to load
      function waitForTweet() {
        var tweet = document.querySelector('.twitter-tweet-rendered, iframe[id^="twitter-widget"]');
        if (tweet) {
          setTimeout(sendHeight, 100);
        } else {
          setTimeout(waitForTweet, 100);
        }
      }

      sendHeight();
      waitForTweet();
      window.addEventListener('resize', sendHeight);

      if (typeof MutationObserver !== 'undefined') {
        var observer = new MutationObserver(function() {
          setTimeout(sendHeight, 100);
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Create fallback when oEmbed fails
 */
function createFallbackTweet(url: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>X Post</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: transparent; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
      border: 1px solid #e1e8ed;
      border-radius: 12px;
      background: #fff;
      text-decoration: none;
      color: #0f1419;
    }
    .fallback:hover { background: #f7f9fa; }
    .x-logo { width: 20px; height: 20px; }
  </style>
</head>
<body>
  <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="fallback">
    <svg class="x-logo" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
    <span>ポストを表示</span>
  </a>
  <script>
    (function() {
      var id = window.location.hash.slice(1);
      if (id && window.parent !== window) {
        window.parent.postMessage({ id: id, height: document.body.scrollHeight }, '*');
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Create error HTML
 */
function createErrorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; padding: 16px; }
    .error { color: #c00; background: #fee; padding: 12px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="error">${escapeHtml(message)}</div>
</body>
</html>`;
}
