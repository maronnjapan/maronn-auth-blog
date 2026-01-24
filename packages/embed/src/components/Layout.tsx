import type { FC, PropsWithChildren } from 'hono/jsx';

/**
 * Base layout component for embed pages
 */
export const EmbedLayout: FC<
  PropsWithChildren<{
    title: string;
    styles?: string;
  }>
> = ({ title, styles, children }) => {
  const baseStyles = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: transparent;
    }
  `;

  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: baseStyles + (styles || '') }} />
      </head>
      <body>
        {children}
        <HeightReporter />
      </body>
    </html>
  );
};

/**
 * Script to report iframe height to parent
 */
const HeightReporter: FC = () => {
  const script = `
    (function() {
      function sendHeight() {
        var height = document.body.scrollHeight;
        var id = window.location.hash.slice(1);
        if (id && window.parent !== window) {
          window.parent.postMessage({ id: id, height: height }, '*');
        }
      }
      sendHeight();
      window.addEventListener('load', sendHeight);
      window.addEventListener('resize', sendHeight);
      if (typeof MutationObserver !== 'undefined') {
        var observer = new MutationObserver(sendHeight);
        observer.observe(document.body, { childList: true, subtree: true });
      }
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
};

/**
 * Error display component
 */
export const ErrorMessage: FC<{ message: string }> = ({ message }) => {
  const styles = `
    .error-message {
      padding: 16px;
      background: #fee;
      border: 1px solid #fcc;
      border-radius: 8px;
      color: #c00;
      text-align: center;
    }
  `;

  return (
    <EmbedLayout title="Error" styles={styles}>
      <div class="error-message">{message}</div>
    </EmbedLayout>
  );
};

/**
 * Loading display component
 */
export const LoadingSpinner: FC = () => {
  const styles = `
    .loading-container {
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
  `;

  return (
    <EmbedLayout title="Loading" styles={styles}>
      <div class="loading-container">
        <div class="spinner" />
      </div>
    </EmbedLayout>
  );
};
