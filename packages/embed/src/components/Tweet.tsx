import type { FC } from 'hono/jsx';

interface TweetOembedProps {
  html: string;
  authorName: string;
}

/**
 * Twitter official embed component
 */
export const TweetEmbed: FC<TweetOembedProps> = ({ html, authorName }) => {
  const heightScript = `
    (function() {
      function sendHeight() {
        var height = document.body.scrollHeight;
        var id = window.location.hash.slice(1);
        if (id && window.parent !== window) {
          window.parent.postMessage({ id: id, height: height }, '*');
        }
      }
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
  `;

  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Tweet by {authorName}</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: transparent; }
          .twitter-tweet { margin: 0 !important; }
        `,
          }}
        />
      </head>
      <body>
        <div dangerouslySetInnerHTML={{ __html: html }} />
        <script
          async
          src="https://platform.twitter.com/widgets.js"
          charset="utf-8"
        />
        <script dangerouslySetInnerHTML={{ __html: heightScript }} />
      </body>
    </html>
  );
};

interface TweetFallbackProps {
  url: string;
}

/**
 * Fallback when tweet cannot be loaded
 */
export const TweetFallback: FC<TweetFallbackProps> = ({ url }) => {
  const heightScript = `
    (function() {
      var id = window.location.hash.slice(1);
      if (id && window.parent !== window) {
        window.parent.postMessage({ id: id, height: document.body.scrollHeight }, '*');
      }
    })();
  `;

  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>X Post</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: transparent; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          .fallback-link {
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
          .fallback-link:hover {
            background: #f7f9fa;
          }
          .x-logo {
            width: 20px;
            height: 20px;
          }
        `,
          }}
        />
      </head>
      <body>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          class="fallback-link"
        >
          <XLogo class="x-logo" />
          <span>ポストを表示</span>
        </a>
        <script dangerouslySetInnerHTML={{ __html: heightScript }} />
      </body>
    </html>
  );
};

/**
 * X (Twitter) logo SVG
 */
const XLogo: FC<{ class?: string }> = ({ class: className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" class={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
