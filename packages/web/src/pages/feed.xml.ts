import type { APIRoute } from 'astro';
import { articles } from '../lib/content';

const SITE_NAME = 'Auth Vault';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site ?? new URL('http://localhost:4321');
  const selfUrl = new URL('/feed.xml', siteUrl).href;
  // published_at が無い記事のための代替値。Atom の updated は省略できない。
  const fallbackDate = new Date().toISOString();

  const entries = articles
    .slice(0, 20)
    .map((article) => {
      const articleUrl = new URL(`/articles/${article.slug}`, siteUrl).href;
      const updated = article.publishedAt ?? fallbackDate;
      const categories = article.topics
        .map((topic) => `    <category term="${escapeXml(topic)}" />`)
        .join('\n');
      return `  <entry>
    <id>${escapeXml(articleUrl)}</id>
    <title>${escapeXml(article.title)}</title>
    <link href="${escapeXml(articleUrl)}" />
    <updated>${updated}</updated>${article.publishedAt ? `\n    <published>${article.publishedAt}</published>` : ''}
    <summary>${escapeXml(article.excerpt)}</summary>
${categories}
  </entry>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="ja">
  <id>${escapeXml(selfUrl)}</id>
  <title>${escapeXml(SITE_NAME)}</title>
  <link href="${escapeXml(siteUrl.href)}" />
  <link rel="self" type="application/atom+xml" href="${escapeXml(selfUrl)}" />
  <updated>${articles[0]?.publishedAt ?? fallbackDate}</updated>
${entries}
</feed>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
    },
  });
};
