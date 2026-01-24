import type { Context } from 'hono';
import { fetchOgp } from '../utils/ogp';
import { CARD_CSP, sanitizeUrl } from '../utils/security';
import { LinkCard, FallbackCard } from '../components/Card';
import { ErrorMessage } from '../components/Layout';

/**
 * Link card embed handler
 * Fetches OGP data and renders a preview card
 */
export async function cardHandler(c: Context): Promise<Response> {
  const url = c.req.query('url');

  if (!url) {
    return c.html(<ErrorMessage message="URLが指定されていません" />, 400);
  }

  const decodedUrl = decodeURIComponent(url);

  // Validate URL - only allow http/https
  const validatedUrl = sanitizeUrl(decodedUrl);
  if (!validatedUrl) {
    return c.html(<ErrorMessage message="無効なURLです" />, 400);
  }

  try {
    const ogpData = await fetchOgp(validatedUrl);
    // Sanitize OGP URLs
    ogpData.image = sanitizeUrl(ogpData.image);
    ogpData.favicon = sanitizeUrl(ogpData.favicon);

    return c.html(<LinkCard ogp={ogpData} originalUrl={validatedUrl} />, 200, {
      'Cache-Control': 'public, max-age=86400',
      'Content-Security-Policy': CARD_CSP,
    });
  } catch (error) {
    console.error('Failed to fetch OGP:', error);
    return c.html(<FallbackCard url={validatedUrl} />, 200, {
      'Cache-Control': 'public, max-age=3600',
      'Content-Security-Policy': CARD_CSP,
    });
  }
}
