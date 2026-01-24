import type { Context } from 'hono';
import { createEmbedHtml, createErrorHtml, escapeHtml } from '../utils/html-template';
import { createEmbedPageHtml } from '../utils/embed-page';
import { fetchOgp, type OgpData } from '../utils/ogp';
import { CARD_CSP, sanitizeUrl } from '../utils/security';

/**
 * Card page handler - returns HTML page that loads link card via JavaScript
 */
export function cardPageHandler(c: Context): Response {
  const html = createEmbedPageHtml({
    type: 'card',
    apiEndpoint: '/api/card',
  });
  return c.html(html);
}

/**
 * Link card embed handler
 * Fetches OGP data and renders a preview card
 */
export async function cardHandler(c: Context): Promise<Response> {
  const url = c.req.query('url');

  if (!url) {
    return c.html(createErrorHtml('URLが指定されていません'), 400);
  }

  const decodedUrl = decodeURIComponent(url);

  // Validate URL - only allow http/https
  const validatedUrl = sanitizeUrl(decodedUrl);
  if (!validatedUrl) {
    return c.html(createErrorHtml('無効なURLです'), 400);
  }

  try {
    const ogpData = await fetchOgp(validatedUrl);
    // Sanitize OGP URLs
    ogpData.image = sanitizeUrl(ogpData.image);
    ogpData.favicon = sanitizeUrl(ogpData.favicon);

    const html = renderLinkCard(ogpData, validatedUrl);
    return c.html(html, 200, {
      'Cache-Control': 'public, max-age=86400',
      'Content-Security-Policy': CARD_CSP,
    });
  } catch (error) {
    console.error('Failed to fetch OGP:', error);
    return c.html(
      createFallbackCard(validatedUrl),
      200,
      {
        'Cache-Control': 'public, max-age=3600',
        'Content-Security-Policy': CARD_CSP,
      }
    );
  }
}

/**
 * Render link card with OGP data
 */
function renderLinkCard(ogp: OgpData, originalUrl: string): string {
  const domain = extractDomain(originalUrl);
  const hasImage = ogp.image && ogp.image.length > 0;

  const content = `
    <a href="${escapeHtml(originalUrl)}" target="_blank" rel="noopener noreferrer" class="link-card ${hasImage ? 'has-image' : 'no-image'}">
      ${
        hasImage
          ? `<div class="card-image">
              <img src="${escapeHtml(ogp.image)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'">
            </div>`
          : ''
      }
      <div class="card-content">
        <div class="card-title">${escapeHtml(ogp.title || domain)}</div>
        ${ogp.description ? `<div class="card-description">${escapeHtml(truncate(ogp.description, 120))}</div>` : ''}
        <div class="card-meta">
          <img src="${escapeHtml(ogp.favicon)}" alt="" class="favicon" onerror="this.style.display='none'">
          <span class="domain">${escapeHtml(ogp.siteName || domain)}</span>
        </div>
      </div>
    </a>
  `;

  return createEmbedHtml({
    content,
    title: ogp.title || domain,
    styles: `
      .link-card {
        display: flex;
        border: 1px solid #e1e8ed;
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
        text-decoration: none;
        color: inherit;
        transition: background-color 0.2s, box-shadow 0.2s;
      }
      .link-card:hover {
        background: #f7f9fa;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }
      .link-card.has-image {
        flex-direction: row;
      }
      .link-card.no-image {
        flex-direction: column;
      }
      .card-image {
        flex-shrink: 0;
        width: 200px;
        height: 120px;
        overflow: hidden;
        background: #f0f2f5;
      }
      .card-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      @media (max-width: 500px) {
        .link-card.has-image {
          flex-direction: column;
        }
        .card-image {
          width: 100%;
          height: 160px;
        }
      }
      .card-content {
        flex: 1;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
      }
      .card-title {
        font-size: 15px;
        font-weight: 600;
        color: #1a1a1a;
        line-height: 1.4;
        margin-bottom: 4px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .card-description {
        font-size: 13px;
        color: #65676b;
        line-height: 1.4;
        margin-bottom: 8px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .card-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #8899a6;
      }
      .favicon {
        width: 16px;
        height: 16px;
        border-radius: 2px;
      }
      .domain {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  });
}

/**
 * Create fallback card when OGP fetch fails
 */
function createFallbackCard(url: string): string {
  const domain = extractDomain(url);

  const content = `
    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="link-card fallback">
      <div class="card-icon">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
        </svg>
      </div>
      <div class="card-content">
        <div class="card-title">${escapeHtml(domain)}</div>
        <div class="card-url">${escapeHtml(truncate(url, 60))}</div>
      </div>
    </a>
  `;

  return createEmbedHtml({
    content,
    title: domain,
    styles: `
      .link-card.fallback {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border: 1px solid #e1e8ed;
        border-radius: 12px;
        background: #f7f9fa;
        text-decoration: none;
        color: inherit;
      }
      .link-card.fallback:hover {
        background: #ebeef1;
      }
      .card-icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e1e8ed;
        border-radius: 8px;
        color: #8899a6;
      }
      .card-content {
        flex: 1;
        min-width: 0;
      }
      .card-title {
        font-size: 14px;
        font-weight: 600;
        color: #1a1a1a;
      }
      .card-url {
        font-size: 12px;
        color: #8899a6;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  });
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Truncate string to specified length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
