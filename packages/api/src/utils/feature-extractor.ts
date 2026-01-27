export interface ArticleFeatures {
  headings: string;
  bodyText: string;
  summary: string;
}

/**
 * Automatically extractable features from markdown content.
 * Summary is excluded because it should be provided by the admin during approval.
 */
export type ExtractedFeatures = Omit<ArticleFeatures, 'summary'>;

/**
 * Extract search-relevant features from markdown content.
 * The input `content` should be the markdown body (frontmatter already removed).
 * Summary is NOT auto-generated — it must be provided by the admin at approval time.
 */
export function extractFeatures(content: string): ExtractedFeatures {
  const headings = extractHeadings(content);
  const bodyText = stripMarkdown(content);

  return { headings, bodyText };
}

/**
 * Extract all headings (h1-h6) from markdown and return them as
 * a newline-separated string.
 */
export function extractHeadings(markdown: string): string {
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  const headings: string[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    headings.push(match[1].trim());
  }

  return headings.join('\n');
}

/**
 * Strip markdown syntax to produce plain text suitable for full-text search.
 */
export function stripMarkdown(markdown: string): string {
  let text = markdown;

  // Remove code blocks (``` ... ```)
  text = text.replace(/```[\s\S]*?```/g, '');

  // Remove inline code (`...`)
  text = text.replace(/`[^`]+`/g, '');

  // Remove images ![alt](url)
  text = text.replace(/!\[.*?\]\(.*?\)/g, '');

  // Convert links [text](url) to just text
  text = text.replace(/\[([^\]]+)\]\(.*?\)/g, '$1');

  // Remove headings markers (# ## ### etc.)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic markers
  text = text.replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2');

  // Remove strikethrough
  text = text.replace(/~~(.*?)~~/g, '$1');

  // Remove blockquote markers
  text = text.replace(/^>\s?/gm, '');

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, '');

  // Remove list markers (-, *, +, 1.)
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Collapse whitespace
  text = text.replace(/\n{2,}/g, '\n');
  text = text.trim();

  return text;
}
