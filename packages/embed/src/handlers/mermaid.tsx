import type { Context } from 'hono';
import { MERMAID_CSP } from '../utils/security';
import { MermaidEmbed } from '../components/Mermaid';
import { ContentLoader, ErrorMessage } from '../components/Layout';

/**
 * Mermaid diagram embed handler
 * Renders mermaid diagrams using mermaid.js loaded from CDN
 */
export async function mermaidHandler(c: Context): Promise<Response> {
  const url = c.req.query('url');

  // If no URL query, return loader that fetches from parent's data-content
  if (!url) {
    return c.html(<ContentLoader embedType="mermaid" />);
  }

  const code = decodeURIComponent(url);

  if (!code.trim()) {
    return c.html(<ErrorMessage message="Mermaidコードが空です" />, 400);
  }

  return c.html(
    <MermaidEmbed code={code} />,
    200,
    {
      'Cache-Control': 'public, max-age=3600',
      'Content-Security-Policy': MERMAID_CSP,
    }
  );
}
