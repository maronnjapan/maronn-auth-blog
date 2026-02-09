import type { FC } from 'hono/jsx';
import { EmbedLayout } from './Layout';

interface MermaidEmbedProps {
  code: string;
}

const mermaidStyles = `
  .mermaid-container {
    display: flex;
    justify-content: center;
    padding: 16px;
    background: #ffffff;
    overflow-x: auto;
  }
  .mermaid-container svg {
    max-width: 100%;
    height: auto;
  }
  .mermaid-error {
    padding: 16px;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 8px;
    color: #c00;
    font-size: 14px;
    white-space: pre-wrap;
  }
`;

/**
 * Mermaid diagram embed component
 * Loads mermaid.js from CDN and renders the diagram client-side
 */
export const MermaidEmbed: FC<MermaidEmbedProps> = ({ code }) => {
  // Escape for safe embedding in a script tag
  const escapedCode = code
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/<\/script/gi, '<\\/script');

  const script = `
    (function() {
      var code = \`${escapedCode}\`;

      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
      script.onload = function() {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'strict',
        });

        mermaid.render('mermaid-diagram', code).then(function(result) {
          document.getElementById('mermaid-output').innerHTML = result.svg;
        }).catch(function(err) {
          document.getElementById('mermaid-output').innerHTML =
            '<div class="mermaid-error">Mermaid rendering error: ' +
            (err.message || err).toString().replace(/</g, '&lt;').replace(/>/g, '&gt;') +
            '</div>';
        });
      };
      script.onerror = function() {
        document.getElementById('mermaid-output').innerHTML =
          '<div class="mermaid-error">Failed to load mermaid library</div>';
      };
      document.head.appendChild(script);
    })();
  `;

  return (
    <EmbedLayout title="Mermaid Diagram" styles={mermaidStyles}>
      <div class="mermaid-container">
        <div id="mermaid-output">
          <div style="padding: 20px; text-align: center; color: #666;">Loading...</div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </EmbedLayout>
  );
};
