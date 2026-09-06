import { describe, expect, it } from 'vitest';
import {
  compareArticles,
  normalizePublishedAt,
  splitFrontmatter,
  toExcerpt,
} from './prepare-content.mjs';
import { rewriteImageTags, srcToRelativePath, toWebpSrc } from './optimize-images.mjs';

describe('splitFrontmatter', () => {
  it('Zenn 形式の frontmatter を解釈できる', () => {
    const { data, body } = splitFrontmatter(
      [
        '---',
        'title: "MCP の認可を実装する"',
        'emoji: "📌"',
        'type: "tech" # tech: 技術記事 / idea: アイデア',
        'topics: ["MCP","OAuth"]',
        'published: true',
        'published_at: 2025-08-16 22:00',
        'targetCategories: ["authorization"]',
        '---',
        '## はじめに',
        '本文',
      ].join('\n'),
      'test.md'
    );

    expect(data.title).toBe('MCP の認可を実装する');
    expect(data.type).toBe('tech');
    expect(data.topics).toEqual(['MCP', 'OAuth']);
    expect(data.published).toBe(true);
    expect(data.targetCategories).toEqual(['authorization']);
    expect(body).toBe('## はじめに\n本文');
  });

  it('frontmatter が無ければファイル名付きで失敗する', () => {
    expect(() => splitFrontmatter('# 見出しだけ\n', 'articles/foo.md')).toThrow('articles/foo.md');
  });
});

describe('normalizePublishedAt', () => {
  it('未設定なら null を返す', () => {
    expect(normalizePublishedAt(undefined, 'test.md')).toBeNull();
    expect(normalizePublishedAt('', 'test.md')).toBeNull();
  });

  it('Date と文字列のどちらも ISO 8601 に正規化する', () => {
    expect(normalizePublishedAt(new Date('2025-08-16T13:00:00Z'), 'test.md')).toBe(
      '2025-08-16T13:00:00.000Z'
    );
    expect(normalizePublishedAt('2025-08-16 22:00', 'test.md')).toMatch(/^2025-08-16T/);
  });

  it('日時として読めない値は失敗させる', () => {
    expect(() => normalizePublishedAt('きのう', 'articles/foo.md')).toThrow('articles/foo.md');
  });
});

describe('toExcerpt', () => {
  it('コードブロック・画像・リンクを落として抜粋にする', () => {
    const excerpt = toExcerpt(
      ['## 見出し', '```ts', 'const a = 1;', '```', '![](/images/a/b.png)', '[Zenn](https://zenn.dev) を読む'].join('\n')
    );
    expect(excerpt).toBe('見出し Zenn を読む');
  });

  it('指定長を超えたら省略記号を付ける', () => {
    expect(toExcerpt('あ'.repeat(200))).toHaveLength(141);
  });
});

describe('compareArticles', () => {
  const article = (slug, publishedAt) => ({ slug, publishedAt });

  it('公開日の新しい順に並べる', () => {
    const sorted = [
      article('old', '2024-01-01T00:00:00.000Z'),
      article('new', '2025-01-01T00:00:00.000Z'),
    ].sort(compareArticles);
    expect(sorted.map((a) => a.slug)).toEqual(['new', 'old']);
  });

  it('公開日未設定の記事は末尾へ回し、同着は slug 順にする', () => {
    const sorted = [
      article('undated-b', null),
      article('undated-a', null),
      article('dated', '2024-01-01T00:00:00.000Z'),
    ].sort(compareArticles);
    expect(sorted.map((a) => a.slug)).toEqual(['dated', 'undated-a', 'undated-b']);
  });
});

describe('画像の最適化', () => {
  it('src の拡張子だけを webp に差し替える', () => {
    expect(toWebpSrc('/images/a/b.png')).toBe('/images/a/b.webp');
    expect(toWebpSrc('/images/a/b.GIF')).toBe('/images/a/b.webp');
    expect(toWebpSrc('/images/a/b%201.jpeg')).toBe('/images/a/b%201.webp');
  });

  it('webp 以外の拡張子は触らない', () => {
    expect(toWebpSrc('/images/a/b.svg')).toBe('/images/a/b.svg');
  });

  it('URL エンコードされた src を実ファイルの相対パスに戻す', () => {
    expect(srcToRelativePath('/images/a/b%201.png')).toBe('images/a/b 1.png');
    expect(srcToRelativePath('/images/a/AWS.drawio_(5).png')).toBe('images/a/AWS.drawio_(5).png');
  });

  it('img タグに寸法と読み込みヒントを足して src を差し替える', () => {
    const html = rewriteImageTags('<p><img src="/images/a/b.png" alt="図"></p>', () => ({
      src: '/images/a/b.webp',
      width: 800,
      height: 600,
    }));
    expect(html).toContain('src="/images/a/b.webp"');
    expect(html).toContain('width="800"');
    expect(html).toContain('height="600"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('alt="図"');
  });

  it('すでにある属性は上書きしない', () => {
    const html = rewriteImageTags('<img src="/images/a/b.png" loading="eager" width="10" height="20">', () => ({
      src: '/images/a/b.webp',
      width: 800,
      height: 600,
    }));
    expect(html).toContain('loading="eager"');
    expect(html).toContain('width="10"');
    expect(html).not.toContain('width="800"');
  });

  it('変換情報が無い画像はそのまま残す', () => {
    const tag = '<img src="/images/a/b.png">';
    expect(rewriteImageTags(tag, () => undefined)).toBe(tag);
  });

  it('images 配下以外の画像には触らない', () => {
    const tag = '<img src="https://example.com/x.png">';
    expect(rewriteImageTags(tag, () => ({ src: '/nope.webp' }))).toBe(tag);
  });
});
