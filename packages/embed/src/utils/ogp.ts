export interface OgpData {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
  type: string;
  favicon: string;
}

/**
 * Fetch OGP metadata from a URL
 */
export async function fetchOgp(url: string): Promise<OgpData> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; EmbedBot/1.0; +https://maronn-room.com)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  return parseOgp(html, url);
}

/**
 * Parse OGP metadata from HTML
 */
function parseOgp(html: string, originalUrl: string): OgpData {
  const getMetaContent = (
    property: string,
    nameAttr: 'property' | 'name' = 'property'
  ): string => {
    const regex = new RegExp(
      `<meta\\s+(?:[^>]*?${nameAttr}=["']${property}["'][^>]*?content=["']([^"']*?)["']|content=["']([^"']*?)["'][^>]*?${nameAttr}=["']${property}["'])`,
      'i'
    );
    const match = html.match(regex);
    return match ? match[1] || match[2] || '' : '';
  };

  const getTitle = (): string => {
    // Try og:title first
    const ogTitle = getMetaContent('og:title');
    if (ogTitle) return ogTitle;

    // Try twitter:title
    const twitterTitle = getMetaContent('twitter:title', 'name');
    if (twitterTitle) return twitterTitle;

    // Fall back to <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
  };

  const getDescription = (): string => {
    const ogDesc = getMetaContent('og:description');
    if (ogDesc) return ogDesc;

    const twitterDesc = getMetaContent('twitter:description', 'name');
    if (twitterDesc) return twitterDesc;

    const metaDesc = getMetaContent('description', 'name');
    return metaDesc;
  };

  const getImage = (): string => {
    const ogImage = getMetaContent('og:image');
    if (ogImage) return resolveUrl(ogImage, originalUrl);

    const twitterImage = getMetaContent('twitter:image', 'name');
    if (twitterImage) return resolveUrl(twitterImage, originalUrl);

    return '';
  };

  const getFavicon = (): string => {
    // Try various favicon patterns
    const patterns = [
      /<link[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["']([^"']+)["']/i,
      /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut\s+)?icon["']/i,
      /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return resolveUrl(match[1], originalUrl);
      }
    }

    // Default to /favicon.ico
    try {
      const urlObj = new URL(originalUrl);
      return `${urlObj.origin}/favicon.ico`;
    } catch {
      return '';
    }
  };

  return {
    title: getTitle(),
    description: getDescription(),
    image: getImage(),
    siteName: getMetaContent('og:site_name') || extractDomain(originalUrl),
    url: getMetaContent('og:url') || originalUrl,
    type: getMetaContent('og:type') || 'website',
    favicon: getFavicon(),
  };
}

/**
 * Resolve relative URL to absolute
 */
function resolveUrl(url: string, base: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}
