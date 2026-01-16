import markdownToHtml from 'zenn-markdown-html';
import { frontmatterSchema, type Frontmatter } from '@maronn-auth-blog/shared';
import { ValidationError } from '@maronn-auth-blog/shared';

export interface ParsedArticle {
  frontmatter: Frontmatter;
  content: string;
  html: string;
  images: string[];
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

    const value = valueParts.join(':').trim();

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
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      continue;
    }

    // Parse string
    frontmatter[key.trim()] = value;
  }

  return { frontmatter, content };
}

export function extractImagePaths(markdown: string): string[] {
  const imageRegex = /!\[.*?\]\((\.\/images\/[^)]+)\)/g;
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
  apiUrl: string
): string {
  return html.replace(
    /src="\.\/images\/([^"]+)"/g,
    `src="${apiUrl}/images/${userId}/${slug}/$1"`
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
