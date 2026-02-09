export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Extract heading items (h1-h4) from HTML string for table of contents.
 * Only headings with id attributes are included.
 */
export function extractTocItems(html: string): TocItem[] {
  const headingRegex = /<h([1-4])\s[^>]*?id="([^"]*)"[^>]*?>([\s\S]*?)<\/h\1>/gi;
  const items: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const id = match[2];
    // Strip HTML tags (e.g. anchor links) to get plain text
    const text = match[3].replace(/<[^>]+>/g, '').trim();
    if (text) {
      items.push({ id, text, level });
    }
  }

  return items;
}

/**
 * Get the base heading level (minimum level present).
 * If h1 exists, h1 is the base. Otherwise, the smallest heading level is the base.
 */
export function getBaseLevel(items: TocItem[]): number {
  if (items.length === 0) return 2;
  return Math.min(...items.map((item) => item.level));
}
