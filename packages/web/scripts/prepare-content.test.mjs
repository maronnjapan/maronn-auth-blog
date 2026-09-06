import { describe, expect, it } from 'vitest';
import {
  compareArticles,
  normalizePublishedAt,
  splitFrontmatter,
  toExcerpt,
} from './prepare-content.mjs';

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
