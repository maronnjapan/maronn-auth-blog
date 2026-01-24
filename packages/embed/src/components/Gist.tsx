import type { FC } from 'hono/jsx';

interface GistEmbedProps {
  scriptUrl: string;
  originalUrl: string;
}

/**
 * GitHub Gist official embed component
 */
export const GistEmbed: FC<GistEmbedProps> = ({ scriptUrl, originalUrl }) => {
  const loadScript = `
    (function() {
      var container = document.getElementById('gist-container');
      var originalWrite = document.write;
      var gistHtml = '';
      document.write = function(html) {
        gistHtml += html;
      };

      var script = document.createElement('script');
      script.src = '${scriptUrl}';
      script.onload = function() {
        document.write = originalWrite;
        container.innerHTML = gistHtml;
        setTimeout(sendHeight, 100);
      };
      script.onerror = function() {
        document.write = originalWrite;
        container.innerHTML = '<a href="${originalUrl}" target="_blank" rel="noopener noreferrer" style="display:block;padding:16px;border:1px solid #d0d7de;border-radius:6px;background:#f6f8fa;text-decoration:none;color:#0969da;">Gist を表示</a>';
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
  `;

  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>GitHub Gist</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: transparent; }
          .gist { font-size: 14px !important; }
          .gist .gist-file { margin-bottom: 0 !important; border: none !important; }
          .gist .gist-data { border: none !important; }
        `,
          }}
        />
      </head>
      <body>
        <div id="gist-container" />
        <script dangerouslySetInnerHTML={{ __html: loadScript }} />
      </body>
    </html>
  );
};
