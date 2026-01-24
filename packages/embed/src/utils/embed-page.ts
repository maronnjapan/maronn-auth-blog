/**
 * Create embed page HTML that loads data from parent iframe
 * This page is loaded in an iframe and fetches embed data via JavaScript
 */
export function createEmbedPageHtml(options: {
  type: 'tweet' | 'github' | 'gist' | 'card';
  apiEndpoint: string;
}): string {
  const { type, apiEndpoint } = options;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${type} embed</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: transparent;
    }
    .loading {
      padding: 20px;
      text-align: center;
      color: #666;
    }
    .loading-spinner {
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
    .error {
      padding: 16px;
      background: #fee;
      border: 1px solid #fcc;
      border-radius: 8px;
      color: #c00;
      text-align: center;
    }
    #content {
      min-height: 50px;
    }
  </style>
</head>
<body>
  <div id="content">
    <div class="loading">
      <div class="loading-spinner"></div>
    </div>
  </div>
  <script>
    (function() {
      var id = window.location.hash.slice(1);
      var contentDiv = document.getElementById('content');

      // Send height to parent window
      function sendHeight() {
        var height = document.body.scrollHeight;
        if (id && window.parent !== window) {
          window.parent.postMessage({
            id: id,
            height: height
          }, '*');
        }
      }

      // Get data-content from parent iframe element
      function getContentUrl() {
        if (!id || window.parent === window) {
          return null;
        }

        try {
          var iframe = window.parent.document.getElementById(id);
          if (iframe && iframe.dataset && iframe.dataset.content) {
            return decodeURIComponent(iframe.dataset.content);
          }
        } catch (e) {
          // Cross-origin access denied, try message passing
          console.error('Cannot access parent document:', e);
        }
        return null;
      }

      // Fetch and render embed content
      async function loadEmbed() {
        var url = getContentUrl();

        if (!url) {
          contentDiv.innerHTML = '<div class="error">コンテンツURLが見つかりません</div>';
          sendHeight();
          return;
        }

        try {
          var apiUrl = '${apiEndpoint}?url=' + encodeURIComponent(url);
          var response = await fetch(apiUrl);

          if (!response.ok) {
            throw new Error('Failed to fetch: ' + response.status);
          }

          var html = await response.text();

          // Extract body content from full HTML response
          var bodyMatch = html.match(/<body[^>]*>([\\s\\S]*?)<\\/body>/i);
          if (bodyMatch) {
            contentDiv.innerHTML = bodyMatch[1];
          } else {
            contentDiv.innerHTML = html;
          }

          // Extract and apply styles
          var styleMatch = html.match(/<style[^>]*>([\\s\\S]*?)<\\/style>/gi);
          if (styleMatch) {
            styleMatch.forEach(function(style) {
              var styleContent = style.replace(/<\\/?style[^>]*>/gi, '');
              var styleEl = document.createElement('style');
              styleEl.textContent = styleContent;
              document.head.appendChild(styleEl);
            });
          }

          sendHeight();

          // Observe for image loads and dynamic changes
          var images = contentDiv.querySelectorAll('img');
          images.forEach(function(img) {
            img.addEventListener('load', sendHeight);
            img.addEventListener('error', sendHeight);
          });

        } catch (error) {
          console.error('Failed to load embed:', error);
          contentDiv.innerHTML = '<div class="error">コンテンツの読み込みに失敗しました</div>';
          sendHeight();
        }
      }

      // Initialize
      loadEmbed();

      // Re-send height on resize
      window.addEventListener('resize', sendHeight);

      // Observe DOM changes
      if (typeof MutationObserver !== 'undefined') {
        var observer = new MutationObserver(sendHeight);
        observer.observe(document.body, { childList: true, subtree: true });
      }
    })();
  </script>
</body>
</html>`;
}
