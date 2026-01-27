import { describe, it, expect } from 'vitest';
import { extractFeatures, extractHeadings, stripMarkdown } from './feature-extractor';

describe('extractHeadings', () => {
  it('should extract all heading levels', () => {
    const markdown = `# H1 Heading
Some text
## H2 Heading
More text
### H3 Heading
#### H4 Heading
##### H5 Heading
###### H6 Heading`;

    const result = extractHeadings(markdown);

    expect(result).toBe(
      'H1 Heading\nH2 Heading\nH3 Heading\nH4 Heading\nH5 Heading\nH6 Heading'
    );
  });

  it('should return empty string when no headings', () => {
    const markdown = `Just some paragraph text without headings.`;

    const result = extractHeadings(markdown);

    expect(result).toBe('');
  });

  it('should not match hash in non-heading context', () => {
    const markdown = `Some text with #hashtag
And a code block:
\`\`\`
# this is a comment
\`\`\``;

    const result = extractHeadings(markdown);

    // #hashtag has no space after #, so it shouldn't match
    // code block content could match line-by-line regex, but this is acceptable
    expect(result).not.toContain('hashtag');
  });

  it('should handle Japanese headings', () => {
    const markdown = `## 認証フロー
### Auth0 の設定`;

    const result = extractHeadings(markdown);

    expect(result).toBe('認証フロー\nAuth0 の設定');
  });
});

describe('stripMarkdown', () => {
  it('should remove code blocks', () => {
    const markdown = `Some text
\`\`\`typescript
const x = 1;
\`\`\`
After code`;

    const result = stripMarkdown(markdown);

    expect(result).not.toContain('const x = 1');
    expect(result).toContain('Some text');
    expect(result).toContain('After code');
  });

  it('should remove inline code', () => {
    const markdown = 'Use the `console.log` function';

    const result = stripMarkdown(markdown);

    expect(result).not.toContain('`');
    expect(result).toContain('Use the');
    expect(result).toContain('function');
  });

  it('should convert links to just text', () => {
    const markdown = 'Visit [Example](https://example.com) for more';

    const result = stripMarkdown(markdown);

    expect(result).toContain('Example');
    expect(result).not.toContain('https://example.com');
    expect(result).not.toContain('[');
    expect(result).not.toContain(']');
  });

  it('should remove images', () => {
    const markdown = 'Text before ![alt text](./images/screenshot.png) text after';

    const result = stripMarkdown(markdown);

    expect(result).not.toContain('screenshot.png');
    expect(result).toContain('Text before');
    expect(result).toContain('text after');
  });

  it('should remove heading markers', () => {
    const markdown = '## My Heading\nSome content';

    const result = stripMarkdown(markdown);

    expect(result).toContain('My Heading');
    expect(result).not.toMatch(/^##/m);
  });

  it('should remove bold and italic markers', () => {
    const markdown = 'This is **bold** and *italic* and ***both***';

    const result = stripMarkdown(markdown);

    expect(result).toContain('bold');
    expect(result).toContain('italic');
    expect(result).toContain('both');
    expect(result).not.toContain('**');
    expect(result).not.toContain('*');
  });

  it('should remove blockquote markers', () => {
    const markdown = '> This is a quote\n> With two lines';

    const result = stripMarkdown(markdown);

    expect(result).toContain('This is a quote');
    expect(result).not.toMatch(/^>/m);
  });

  it('should remove list markers', () => {
    const markdown = `- Item 1
- Item 2
* Item 3
1. Numbered
2. List`;

    const result = stripMarkdown(markdown);

    expect(result).toContain('Item 1');
    expect(result).toContain('Numbered');
    expect(result).not.toMatch(/^- /m);
    expect(result).not.toMatch(/^\d+\./m);
  });

  it('should remove HTML tags', () => {
    const markdown = 'Text with <strong>HTML</strong> tags';

    const result = stripMarkdown(markdown);

    expect(result).toContain('HTML');
    expect(result).not.toContain('<strong>');
  });

  it('should handle complex markdown document', () => {
    const markdown = `# タイトル

これは**太字**のテキストです。

## セクション1

\`\`\`typescript
const hello = 'world';
\`\`\`

- リスト項目1
- リスト項目2

> 引用テキスト

[リンク](https://example.com)を参照してください。`;

    const result = stripMarkdown(markdown);

    expect(result).toContain('タイトル');
    expect(result).toContain('太字');
    expect(result).toContain('セクション1');
    expect(result).toContain('リスト項目1');
    expect(result).toContain('引用テキスト');
    expect(result).toContain('リンク');
    expect(result).not.toContain("const hello");
    expect(result).not.toContain('**');
    expect(result).not.toContain('https://example.com');
  });
});

describe('extractFeatures', () => {
  it('should extract headings and bodyText from article content', () => {
    const content = `# はじめに

OAuth 2.0 の認証フローについて解説します。

## PKCEとは

PKCE（Proof Key for Code Exchange）は認可コードフローのセキュリティを強化する仕組みです。

### 実装方法

以下のコードで実装できます。

\`\`\`typescript
const verifier = generateCodeVerifier();
\`\`\`

![diagram](./images/flow.png)`;

    const result = extractFeatures(content);

    // headings
    expect(result.headings).toContain('はじめに');
    expect(result.headings).toContain('PKCEとは');
    expect(result.headings).toContain('実装方法');

    // bodyText should contain plain text, no code blocks or images
    expect(result.bodyText).toContain('OAuth 2.0');
    expect(result.bodyText).toContain('PKCE');
    expect(result.bodyText).not.toContain('generateCodeVerifier');
    expect(result.bodyText).not.toContain('flow.png');
  });

  it('should not include summary (admin must provide it)', () => {
    const content = `# Title\n\nSome content here.`;

    const result = extractFeatures(content);

    expect(result).not.toHaveProperty('summary');
  });

  it('should handle empty content', () => {
    const result = extractFeatures('');

    expect(result.headings).toBe('');
    expect(result.bodyText).toBe('');
  });
});
