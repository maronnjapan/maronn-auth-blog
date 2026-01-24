/**
 * Base HTML template for embedded content.
 * Includes script to communicate height to parent via postMessage.
 */
export function createEmbedHtml(options: {
  content: string;
  styles?: string;
  title?: string;
}): string {
  const { content, styles = '', title = 'Embed' } = options;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
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
    ${styles}
  </style>
</head>
<body>
  ${content}
  <script>
    (function() {
      // Send height to parent window for iframe resizing
      function sendHeight() {
        var height = document.body.scrollHeight;
        var id = window.location.hash.slice(1);
        if (id && window.parent !== window) {
          window.parent.postMessage({
            id: id,
            height: height
          }, '*');
        }
      }

      // Send on load and resize
      sendHeight();
      window.addEventListener('load', sendHeight);
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

/**
 * Create error HTML response
 */
export function createErrorHtml(message: string): string {
  return createEmbedHtml({
    content: `<div class="error">${escapeHtml(message)}</div>`,
    styles: `
      .error {
        padding: 16px;
        background: #fee;
        border: 1px solid #fcc;
        border-radius: 8px;
        color: #c00;
        text-align: center;
      }
    `,
    title: 'Error',
  });
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
