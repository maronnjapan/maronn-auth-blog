import type { Context } from 'hono';
import { createEmbedPageHtml } from '../utils/embed-page';
import { escapeHtml } from '../utils/html-template';
import { GIST_CSP } from '../utils/security';

/**
 * Gist page handler - returns HTML page that loads Gist via JavaScript
 */
export function gistPageHandler(c: Context): Response {
  const html = createEmbedPageHtml({
    type: 'gist',
    apiEndpoint: '/api/gist',
  });
  return c.html(html);
}

/**
 * GitHub Gist embed handler
 * Uses GitHub's official Gist embed script
 */
export async function gistHandler(c: Context): Promise<Response> {
  const url = c.req.query('url');

  if (!url) {
    return c.html(createErrorHtml('URLが指定されていません'), 400);
  }

  const decodedUrl = decodeURIComponent(url);
  const gistInfo = parseGistUrl(decodedUrl);

  if (!gistInfo) {
    return c.html(createErrorHtml('無効なGist URLです'), 400);
  }

  // Use GitHub's official embed
  const html = renderOfficialGist(gistInfo, decodedUrl);
  return c.html(html, 200, {
    'Cache-Control': 'public, max-age=3600',
    'Content-Security-Policy': GIST_CSP,
  });
}

interface GistInfo {
  id: string;
  username?: string;
  file?: string;
}

/**
 * Parse Gist URL
 */
function parseGistUrl(url: string): GistInfo | null {
  // Try pattern with username
  let match = url.match(/gist\.github\.com\/([^/]+)\/([a-f0-9]+)/i);
  if (match) {
    const fileMatch = url.match(/[?&]file=([^&]+)/);
    return {
      username: match[1],
      id: match[2],
      file: fileMatch ? decodeURIComponent(fileMatch[1]) : undefined,
    };
  }

  // Try pattern without username (just gist id)
  match = url.match(/gist\.github\.com\/([a-f0-9]+)/i);
  if (match) {
    const fileMatch = url.match(/[?&]file=([^&]+)/);
    return {
      id: match[1],
      file: fileMatch ? decodeURIComponent(fileMatch[1]) : undefined,
    };
  }

  return null;
}

/**
 * Render official GitHub Gist embed
 */
function renderOfficialGist(gist: GistInfo, originalUrl: string): string {
  // Build the embed script URL
  let scriptUrl = `https://gist.github.com/`;
  if (gist.username) {
    scriptUrl += `${gist.username}/`;
  }
  scriptUrl += `${gist.id}.js`;
  if (gist.file) {
    scriptUrl += `?file=${encodeURIComponent(gist.file)}`;
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Gist</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: transparent; }
    /* Override Gist default styles */
    .gist { font-size: 14px !important; }
    .gist .gist-file { margin-bottom: 0 !important; border: none !important; }
    .gist .gist-data { border: none !important; }
  </style>
</head>
<body>
  <div id="gist-container"></div>
  <script>
    // Load Gist embed script dynamically
    (function() {
      var container = document.getElementById('gist-container');

      // Create a callback for document.write
      var originalWrite = document.write;
      var gistHtml = '';
      document.write = function(html) {
        gistHtml += html;
      };

      var script = document.createElement('script');
      script.src = '${escapeHtml(scriptUrl)}';
      script.onload = function() {
        document.write = originalWrite;
        container.innerHTML = gistHtml;

        // Send height to parent
        setTimeout(sendHeight, 100);
      };
      script.onerror = function() {
        document.write = originalWrite;
        container.innerHTML = '<a href="${escapeHtml(originalUrl)}" target="_blank" rel="noopener noreferrer" style="display:block;padding:16px;border:1px solid #d0d7de;border-radius:6px;background:#f6f8fa;text-decoration:none;color:#0969da;">Gist を表示</a>';
        sendHeight();
      };

      document.head.appendChild(script);

      function sendHeight() {
        var height = document.body.scrollHeight;
        var id = window.location.hash.slice(1);
        if (id && window.parent !== window) {
          window.parent.postMessage({ id: id, height: height }, '*');
        }
      }

      window.addEventListener('resize', sendHeight);

      if (typeof MutationObserver !== 'undefined') {
        var observer = new MutationObserver(function() {
          setTimeout(sendHeight, 50);
        });
        observer.observe(document.body, { childList: true, subtree: true });
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
