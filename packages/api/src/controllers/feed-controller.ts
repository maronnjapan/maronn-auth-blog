import { Hono } from 'hono';
import type { Env } from '../types/env';
import { ArticleRepository } from '../infrastructure/repositories/article-repository';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { GetFeedArticlesUsecase } from '../usecases/article/get-feed-articles';
import type { FeedArticle } from '../usecases/article/get-feed-articles';

const app = new Hono<{ Bindings: Env }>();

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildAtomFeed(params: {
  feedTitle: string;
  feedId: string;
  siteUrl: string;
  selfUrl: string;
  updatedAt: string;
  articles: FeedArticle[];
}): string {
  const { feedTitle, feedId, siteUrl, selfUrl, updatedAt, articles } = params;

  const entries = articles
    .map(
      (a) => `
  <entry>
    <id>urn:uuid:${a.id}</id>
    <title>${escapeXml(a.title)}</title>
    <link href="${escapeXml(a.articleUrl)}" />
    <author><name>${escapeXml(a.authorDisplayName)}</name></author>
    <published>${a.publishedAt}</published>
    <updated>${a.updatedAt}</updated>
    ${a.category ? `<category term="${escapeXml(a.category)}" label="${escapeXml(a.category)}" />` : ''}
    ${a.topics.map((t) => `<category term="${escapeXml(t)}" />`).join('\n    ')}
  </entry>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="ja">
  <id>${escapeXml(feedId)}</id>
  <title>${escapeXml(feedTitle)}</title>
  <link href="${escapeXml(siteUrl)}" />
  <link rel="self" type="application/atom+xml" href="${escapeXml(selfUrl)}" />
  <updated>${updatedAt}</updated>
${entries}
</feed>`;
}

// GET /feed.xml - グローバルフィード（最新20件）
app.get('/feed.xml', async (c) => {
  const articleRepo = new ArticleRepository(c.env.DB);
  const userRepo = new UserRepository(c.env.DB);
  const usecase = new GetFeedArticlesUsecase(articleRepo, userRepo, c.env.WEB_URL);

  const articles = await usecase.execute();

  const updatedAt = articles[0]?.updatedAt ?? new Date().toISOString();
  const selfUrl = `${c.env.API_URL}/feed.xml`;

  const xml = buildAtomFeed({
    feedTitle: 'Auth Vault - 最新記事',
    feedId: selfUrl,
    siteUrl: c.env.WEB_URL,
    selfUrl,
    updatedAt,
    articles,
  });

  return c.body(xml, 200, {
    'Content-Type': 'application/atom+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=900',
  });
});

// GET /users/:username/feed.xml - 著者別フィード
app.get('/users/:username/feed.xml', async (c) => {
  const username = c.req.param('username');
  const articleRepo = new ArticleRepository(c.env.DB);
  const userRepo = new UserRepository(c.env.DB);
  const usecase = new GetFeedArticlesUsecase(articleRepo, userRepo, c.env.WEB_URL);

  const articles = await usecase.execute(username);

  if (articles.length === 0) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'User not found or has no published articles' } },
      404
    );
  }

  const displayName = articles[0]?.authorDisplayName ?? username;
  const updatedAt = articles[0]?.updatedAt ?? new Date().toISOString();
  const selfUrl = `${c.env.API_URL}/users/${username}/feed.xml`;

  const xml = buildAtomFeed({
    feedTitle: `${displayName} - Auth Vault`,
    feedId: selfUrl,
    siteUrl: `${c.env.WEB_URL}/${username}`,
    selfUrl,
    updatedAt,
    articles,
  });

  return c.body(xml, 200, {
    'Content-Type': 'application/atom+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=900',
  });
});

export default app;
