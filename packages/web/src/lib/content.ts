import articleIndex from '../generated/articles/index.json';

export const TARGET_CATEGORIES = ['authentication', 'authorization', 'security'] as const;

export type TargetCategory = (typeof TARGET_CATEGORIES)[number];

export interface ArticleMeta {
  slug: string;
  title: string;
  emoji: string;
  topics: string[];
  targetCategories: TargetCategory[];
  /** 記事の frontmatter に published_at がある場合のみ入る。無い場合は日付を表示しない */
  publishedAt: string | null;
  excerpt: string;
}

/** 公開記事の一覧。prepare-content.mjs が公開日の新しい順に並べて出力する。 */
export const articles: ArticleMeta[] = articleIndex as ArticleMeta[];

const htmlLoaders = import.meta.glob<string>('../generated/articles/html/*.html', {
  query: '?raw',
  import: 'default',
});

/** slug に対応する記事本文の HTML を取得する。 */
export async function loadArticleHtml(slug: string): Promise<string> {
  const loader = htmlLoaders[`../generated/articles/html/${slug}.html`];
  if (!loader) {
    throw new Error(`記事 HTML が見つかりません: ${slug}`);
  }
  return loader();
}

export function findArticle(slug: string): ArticleMeta | undefined {
  return articles.find((article) => article.slug === slug);
}

export function articlesByCategory(category: TargetCategory): ArticleMeta[] {
  return articles.filter((article) => article.targetCategories.includes(category));
}

export function articlesByTopic(topic: string): ArticleMeta[] {
  return articles.filter((article) => article.topics.includes(topic));
}

export interface Facet<T extends string = string> {
  value: T;
  count: number;
}

/** 記事が 1 本以上ある対象カテゴリを、記事数の多い順に返す。 */
export function categoryFacets(): Facet<TargetCategory>[] {
  return TARGET_CATEGORIES.map((value) => ({ value, count: articlesByCategory(value).length }))
    .filter((facet) => facet.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** 全トピックを記事数の多い順に返す。同数のときはトピック名順。 */
export function topicFacets(): Facet[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    for (const topic of article.topics) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/** 一覧ページで使う日付表記。published_at が無い記事は空文字を返す。 */
export function formatDate(isoDate: string | null): string {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  });
}
