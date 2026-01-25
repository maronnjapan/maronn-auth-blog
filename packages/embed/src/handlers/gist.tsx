import type { Context } from 'hono';
import { GIST_CSP } from '../utils/security';
import { GistEmbed } from '../components/Gist';
import { ContentLoader, ErrorMessage } from '../components/Layout';

/**
 * GitHub Gist embed handler
 * Uses GitHub's official Gist embed script
 */
export async function gistHandler(c: Context): Promise<Response> {
  const url = c.req.query('url');

  // If no URL query, return loader that fetches from parent's data-content
  if (!url) {
    return c.html(<ContentLoader embedType="gist" />);
  }

  const decodedUrl = decodeURIComponent(url);
  const gistInfo = parseGistUrl(decodedUrl);

  if (!gistInfo) {
    return c.html(<ErrorMessage message="無効なGist URLです" />, 400);
  }

  // Build the embed script URL
  let scriptUrl = 'https://gist.github.com/';
  if (gistInfo.username) {
    scriptUrl += `${gistInfo.username}/`;
  }
  scriptUrl += `${gistInfo.id}.js`;
  if (gistInfo.file) {
    scriptUrl += `?file=${encodeURIComponent(gistInfo.file)}`;
  }

  return c.html(
    <GistEmbed scriptUrl={scriptUrl} originalUrl={decodedUrl} />,
    200,
    {
      'Cache-Control': 'public, max-age=3600',
      'Content-Security-Policy': GIST_CSP,
    }
  );
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
