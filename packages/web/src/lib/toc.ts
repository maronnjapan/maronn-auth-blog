export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface NestedTocItem {
  id: string;
  text: string;
  level: number;
  children: NestedTocItem[];
}

/**
 * Extract heading items (h1-h4) from HTML string for table of contents.
 * Only headings with id attributes are included.
 */
export function extractTocItems(html: string): TocItem[] {
  const headingRegex = /<h([1-4])\s[^>]*?id="([^"]*)"[^>]*?>([\s\S]*?)<\/h\1>/gi;
  const items: TocItem[] = [];

  for (const match of html.matchAll(headingRegex)) {
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

/**
 * Convert flat TOC items to nested structure.
 * Items with higher level (h2, h3, etc.) become children of the previous lower level item.
 */
export function buildNestedToc(items: TocItem[]): NestedTocItem[] {
  if (items.length === 0) return [];

  const result: NestedTocItem[] = [];
  const stack: NestedTocItem[] = [];

  for (const item of items) {
    const newItem: NestedTocItem = {
      id: item.id,
      text: item.text,
      level: item.level,
      children: [],
    };

    // Pop items from stack that have same or higher level
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // This is a root level item
      result.push(newItem);
    } else {
      // This is a child of the last item in stack
      stack[stack.length - 1].children.push(newItem);
    }

    stack.push(newItem);
  }

  return result;
}
