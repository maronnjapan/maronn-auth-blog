import { describe, it, expect } from 'vitest';
import { extractFrontmatter, extractImagePaths, parseArticle } from './markdown-parser';

describe('extractFrontmatter', () => {
  it('should parse frontmatter with quoted strings', () => {
    const markdown = `---
title: "Test Article"
published: true
targetCategories: ["security"]
topics: ["auth0", "oauth"]
---

# Content`;

    const result = extractFrontmatter(markdown);

    expect(result.frontmatter.title).toBe('Test Article');
    expect(result.frontmatter.published).toBe(true);
    expect(result.frontmatter.targetCategories).toEqual(['security']);
    expect(result.frontmatter.topics).toEqual(['auth0', 'oauth']);
    expect(result.content).toBe('\n# Content');
  });

  it('should parse frontmatter without quotes', () => {
    const markdown = `---
title: Test Article
published: true
targetCategories: [authentication, security]
topics: [auth0, oauth]
---

# Content`;

    const result = extractFrontmatter(markdown);

    expect(result.frontmatter.title).toBe('Test Article');
    expect(result.frontmatter.published).toBe(true);
    expect(result.frontmatter.targetCategories).toEqual(['authentication', 'security']);
    expect(result.frontmatter.topics).toEqual(['auth0', 'oauth']);
  });

  it('should handle single quotes', () => {
    const markdown = `---
title: 'Test Article'
published: true
targetCategories: ['authorization']
topics: ['auth0', 'oauth']
---

# Content`;

    const result = extractFrontmatter(markdown);

    expect(result.frontmatter.title).toBe('Test Article');
    expect(result.frontmatter.targetCategories).toEqual(['authorization']);
    expect(result.frontmatter.topics).toEqual(['auth0', 'oauth']);
  });

  it('should set default empty array for topics if not present', () => {
    const markdown = `---
title: "Test Article"
published: true
targetCategories: ["security"]
---

# Content`;

    const result = extractFrontmatter(markdown);

    expect(result.frontmatter.topics).toEqual([]);
  });

  it('should handle optional category field', () => {
    const markdown = `---
title: "Test Article"
published: true
category: "認証"
targetCategories: ["authentication"]
topics: ["auth0"]
---

# Content`;

    const result = extractFrontmatter(markdown);

    expect(result.frontmatter.category).toBe('認証');
  });

  it('should handle empty array', () => {
    const markdown = `---
title: "Test Article"
published: true
targetCategories: ["security"]
topics: []
---

# Content`;

    const result = extractFrontmatter(markdown);

    expect(result.frontmatter.topics).toEqual([]);
  });

  it('should throw error for invalid frontmatter format', () => {
    const markdown = `# No frontmatter`;

    expect(() => extractFrontmatter(markdown)).toThrow('Invalid frontmatter format');
  });
});

describe('extractImagePaths', () => {
  it('should extract image paths from markdown', () => {
    const markdown = `
# Title

![alt text](./images/screenshot.png)
![another](./images/diagram.jpg)
`;

    const result = extractImagePaths(markdown);

    expect(result).toEqual(['./images/screenshot.png', './images/diagram.jpg']);
  });

  it('should return empty array if no images', () => {
    const markdown = `# Title\n\nNo images here`;

    const result = extractImagePaths(markdown);

    expect(result).toEqual([]);
  });

  it('should not match external URLs', () => {
    const markdown = `
![external](https://example.com/image.png)
![local](./images/local.png)
`;

    const result = extractImagePaths(markdown);

    expect(result).toEqual(['./images/local.png']);
  });
});

describe('parseArticle', () => {
  it('should parse complete article', () => {
    const markdown = `---
title: "Complete Article"
published: true
category: "認証"
targetCategories: ["authentication", "security"]
topics: ["auth0", "oauth", "security"]
---

# Article Content

![screenshot](./images/test.png)
`;

    const result = parseArticle(markdown, 'https://embed.example.com');

    expect(result.frontmatter.title).toBe('Complete Article');
    expect(result.frontmatter.published).toBe(true);
    expect(result.frontmatter.category).toBe('認証');
    expect(result.frontmatter.targetCategories).toEqual(['authentication', 'security']);
    expect(result.frontmatter.topics).toEqual(['auth0', 'oauth', 'security']);
    expect(result.images).toEqual(['./images/test.png']);
    expect(result.html).toContain('<h1');
  });

  it('should validate frontmatter with Zod schema', () => {
    const markdown = `---
title: ""
published: true
targetCategories: ["invalid_category"]
topics: ["topic"]
---

# Content`;

    expect(() => parseArticle(markdown, 'https://embed.example.com')).toThrow();
  });

  it('should reject empty targetCategories array', () => {
    const markdown = `---
title: "Test"
published: true
targetCategories: []
topics: []
---

# Content`;

    expect(() => parseArticle(markdown, 'https://embed.example.com')).toThrow();
  });
});
