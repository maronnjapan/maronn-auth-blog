/**
 * Validate and sanitize URL
 * Prevents javascript: and data: protocol attacks
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  // Only allow http and https protocols
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.href;
  } catch {
    // If URL parsing fails, try to handle relative URLs
    if (url.startsWith('/') || url.startsWith('./')) {
      return url;
    }
    return '';
  }
}

/**
 * Generate Content Security Policy header value
 */
export function generateCsp(options: {
  allowScripts?: string[];
  allowStyles?: string[];
  allowImages?: string[];
  allowFrames?: string[];
  allowConnect?: string[];
}): string {
  const directives: string[] = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${(options.allowScripts || []).join(' ')}`.trim(),
    `style-src 'self' 'unsafe-inline' ${(options.allowStyles || []).join(' ')}`.trim(),
    `img-src 'self' data: https: ${(options.allowImages || []).join(' ')}`.trim(),
    `frame-src ${(options.allowFrames || ["'none'"]).join(' ')}`.trim(),
    `connect-src 'self' ${(options.allowConnect || []).join(' ')}`.trim(),
    "font-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
  ];

  return directives.join('; ');
}

/**
 * CSP for Twitter embed
 * widgets.js requires access to multiple Twitter/X domains for proper rendering
 *
 * Reference: https://developer.x.com/en/docs/x-for-websites/javascript-api/guides/set-up-twitter-for-websites
 */
export const TWITTER_CSP = generateCsp({
  allowScripts: [
    'https://platform.twitter.com',
    'https://cdn.syndication.twimg.com',
  ],
  allowStyles: [
    'https://platform.twitter.com',
    'https://ton.twimg.com',
  ],
  allowImages: [
    'https://pbs.twimg.com',
    'https://abs.twimg.com',
    'https://ton.twimg.com',
  ],
  allowFrames: [
    'https://platform.twitter.com',
    'https://syndication.twitter.com',
  ],
  allowConnect: [
    'https://syndication.twitter.com',
    'https://cdn.syndication.twimg.com',
  ],
});

/**
 * CSP for Gist embed
 */
export const GIST_CSP = generateCsp({
  allowScripts: ['https://gist.github.com'],
  allowStyles: ['https://github.githubassets.com'],
  allowImages: ['https://avatars.githubusercontent.com', 'https://github.githubassets.com'],
  allowFrames: ["'none'"],
});

/**
 * CSP for GitHub file embed (no external scripts)
 */
export const GITHUB_CSP = generateCsp({
  allowScripts: [],
  allowStyles: [],
  allowImages: [],
  allowFrames: ["'none'"],
});

/**
 * CSP for OGP card embed (no external scripts)
 */
export const CARD_CSP = generateCsp({
  allowScripts: [],
  allowStyles: [],
  allowImages: [], // Allow any https images for OGP
  allowFrames: ["'none'"],
});
