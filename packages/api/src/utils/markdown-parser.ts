import markdownToHtmlImport from 'zenn-markdown-html';
import { frontmatterSchema, type Frontmatter } from '@maronn-auth-blog/shared';
import { ValidationError } from '@maronn-auth-blog/shared';

type MarkdownToHtmlFn = (markdown: string, options: { embedOrigin: string }) => string;

const markdownToHtml: MarkdownToHtmlFn =
  typeof markdownToHtmlImport === 'function'
    ? (markdownToHtmlImport as MarkdownToHtmlFn)
    : ((markdownToHtmlImport as { default: MarkdownToHtmlFn }).default as MarkdownToHtmlFn);

export interface ParsedArticle {
  frontmatter: Frontmatter;
  content: string;
  html: string;
  images: string[];
}

/**
 * Remove surrounding quotes from a string
 */
function removeQuotes(str: string): string {
  const trimmed = str.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Strip inline YAML comment from a value string.
 * Handles comments after arrays like: [a, b] # comment
 * and after quoted strings like: "value" # comment
 * but preserves # inside quotes: "has # inside"
 */
function stripInlineComment(value: string): string {
  // If the value contains a bracket-enclosed array, strip comment after the closing bracket
  const bracketEnd = value.indexOf(']');
  if (value.startsWith('[') && bracketEnd !== -1) {
    return value.slice(0, bracketEnd + 1).trim();
  }

  // For quoted strings, find the closing quote first
  if (value.startsWith('"') || value.startsWith("'")) {
    const quote = value[0];
    const closingQuote = value.indexOf(quote, 1);
    if (closingQuote !== -1) {
      // Check if there's a # after the closing quote
      const afterQuote = value.slice(closingQuote + 1).trim();
      if (afterQuote.startsWith('#') || afterQuote === '') {
        return value.slice(0, closingQuote + 1).trim();
      }
    }
    return value;
  }

  // For unquoted values, strip # comment (with preceding space)
  const hashIndex = value.indexOf(' #');
  if (hashIndex !== -1) {
    return value.slice(0, hashIndex).trim();
  }

  return value;
}

export function extractFrontmatter(markdown: string): {
  frontmatter: Record<string, any>;
  content: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    throw new ValidationError('Invalid frontmatter format');
  }

  const [, frontmatterYaml, content] = match;

  // Simple YAML parser for frontmatter
  const frontmatter: Record<string, any> = {};
  const lines = frontmatterYaml.split('\n');

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    if (!key || !valueParts.length) continue;

    const rawValue = valueParts.join(':').trim();
    // Remove inline YAML comments (# ...) that are outside of quotes and brackets
    const value = stripInlineComment(rawValue);

    // Parse boolean
    if (value === 'true' || value === 'false') {
      frontmatter[key.trim()] = value === 'true';
      continue;
    }

    // Parse array
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1);
      frontmatter[key.trim()] = arrayContent
        .split(',')
        .map((item) => removeQuotes(item))
        .filter((item) => item.length > 0);
      continue;
    }

    // Parse string (remove quotes)
    frontmatter[key.trim()] = removeQuotes(value);
  }

  // Set default empty array for topics if not present
  if (!frontmatter.topics) {
    frontmatter.topics = [];
  }

  return { frontmatter, content };
}

export function extractImagePaths(markdown: string): string[] {
  const imageRegex = /!\[.*?\]\(((?:\.\/|\/)images\/[^)]+)\)/g;
  const images: string[] = [];
  let match;

  while ((match = imageRegex.exec(markdown)) !== null) {
    images.push(match[1]);
  }

  return images;
}

export function convertImagePaths(
  html: string,
  userId: string,
  slug: string,
  imageUrl: string
): string {
  return html.replace(
    /src="(?:\.\/|\/)images\/(?:[^"]*\/)?([^"\/]+)"/g,
    `src="${imageUrl}/images/${userId}/${slug}/$1"`
  );
}

export function parseArticle(markdown: string, embedOrigin: string): ParsedArticle {
  const { frontmatter: rawFrontmatter, content } = extractFrontmatter(markdown);

  // Validate frontmatter
  const frontmatter = frontmatterSchema.parse(rawFrontmatter);

  // Convert markdown to HTML
  const html = markdownToHtml(content, {
    embedOrigin,
  });

  // Extract image paths
  const images = extractImagePaths(content);

  return {
    frontmatter,
    content,
    html,
    images,
  };
}
