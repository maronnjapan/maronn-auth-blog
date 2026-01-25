import type { FC } from 'hono/jsx';
import { EmbedLayout } from './Layout';

interface TweetEmbedProps {
  tweetId: string;
  tweetUrl: string;
}

/**
 * Styles for the tweet embed container
 */
const tweetEmbedStyles = `
  .tweet-container {
    max-width: 550px;
    margin: 0 auto;
  }
  .tweet-loading {
    padding: 20px;
    text-align: center;
    color: #666;
  }
  .spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid #e1e8ed;
    border-top-color: #1d9bf0;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  /* Hide blockquote before widgets.js renders */
  .twitter-tweet {
    visibility: hidden;
    height: 0;
    overflow: hidden;
  }
  .twitter-tweet-rendered {
    visibility: visible;
    height: auto;
  }
`;

/**
 * Tweet embed component using official Twitter widgets.js
 * Uses twttr.widgets.createTweet for proper rendering
 *
 * Reference: https://developer.x.com/en/docs/x-for-websites/javascript-api/guides/set-up-twitter-for-websites
 */
export const TweetEmbed: FC<TweetEmbedProps> = ({ tweetId, tweetUrl }) => {
  // Script to load widgets.js and render tweet
  const script = `
    (function() {
      var tweetId = "${tweetId}";
      var container = document.getElementById('tweet-container');
      var loading = document.getElementById('tweet-loading');

      // Load Twitter widgets.js
      window.twttr = (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0],
          t = window.twttr || {};
        if (d.getElementById(id)) return t;
        js = d.createElement(s);
        js.id = id;
        js.src = "https://platform.twitter.com/widgets.js";
        js.async = true;
        fjs.parentNode.insertBefore(js, fjs);
        t._e = [];
        t.ready = function(f) { t._e.push(f); };
        return t;
      }(document, "script", "twitter-wjs"));

      // When widgets.js is ready, create the tweet
      twttr.ready(function(twttr) {
        twttr.widgets.createTweet(
          tweetId,
          container,
          {
            align: 'center',
            conversation: 'none',
            dnt: true
          }
        ).then(function(el) {
          // Hide loading indicator
          if (loading) {
            loading.style.display = 'none';
          }

          // Report height to parent after tweet renders
          setTimeout(function() {
            var height = document.body.scrollHeight;
            var id = window.location.hash.slice(1);
            if (id && window.parent !== window) {
              window.parent.postMessage({ id: id, height: height }, '*');
            }
          }, 100);

          // Also report on any subsequent size changes
          if (typeof ResizeObserver !== 'undefined' && el) {
            var resizeObserver = new ResizeObserver(function() {
              var height = document.body.scrollHeight;
              var id = window.location.hash.slice(1);
              if (id && window.parent !== window) {
                window.parent.postMessage({ id: id, height: height }, '*');
              }
            });
            resizeObserver.observe(el);
          }
        }).catch(function(err) {
          console.error('Failed to render tweet:', err);
          // Show fallback link on error
          if (loading) {
            loading.innerHTML = '<a href="${tweetUrl}" target="_blank" rel="noopener noreferrer" style="color: #1d9bf0;">ポストを表示</a>';
          }
        });
      });
    })();
  `;

  return (
    <EmbedLayout title="X Post" styles={tweetEmbedStyles}>
      <div id="tweet-loading" class="tweet-loading">
        <div class="spinner" />
      </div>
      <div id="tweet-container" class="tweet-container" />
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </EmbedLayout>
  );
};

interface TweetFallbackProps {
  url: string;
}

const fallbackStyles = `
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
  @media (max-width: 500px) {
    .fallback-link {
      padding: 12px;
      gap: 6px;
    }
    .x-logo {
      width: 18px;
      height: 18px;
    }
    .fallback-link span {
      font-size: 14px;
    }
  }
`;

/**
 * Fallback when tweet cannot be loaded
 */
export const TweetFallback: FC<TweetFallbackProps> = ({ url }) => {
  return (
    <EmbedLayout title="X Post" styles={fallbackStyles}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        class="fallback-link"
      >
        <XLogo class="x-logo" />
        <span>ポストを表示</span>
      </a>
    </EmbedLayout>
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
