/**
 * ビルド前のコンテンツ準備スクリプト。
 *
 * - リポジトリ直下の articles/*.md を読み、frontmatter を検証して HTML に変換する
 * - リポジトリ直下の images/ を web パッケージの public/images/ へ同期する
 * - src/content/legal/*.md を HTML に変換する
 *
 * 出力先の src/generated/ と public/images/ は .gitignore 済み（生成物）。
 */
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import yaml from 'js-yaml';
import markdownToHtmlImport from 'zenn-markdown-html';

const markdownToHtml =
  typeof markdownToHtmlImport === 'function' ? markdownToHtmlImport : markdownToHtmlImport.default;

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDir = join(__dirname, '..');
const repoRoot = join(webDir, '..', '..');

const articlesDir = join(repoRoot, 'articles');
const imagesDir = join(repoRoot, 'images');
const legalContentDir = join(webDir, 'src', 'content', 'legal');

const generatedDir = join(webDir, 'src', 'generated');
const articlesOutDir = join(generatedDir, 'articles');
const htmlOutDir = join(articlesOutDir, 'html');
const legalOutDir = join(generatedDir, 'legal');
const publicImagesDir = join(webDir, 'public', 'images');

const EMBED_ORIGIN = process.env.PUBLIC_EMBED_ORIGIN || 'http://localhost:8788';
const TARGET_CATEGORIES = ['authentication', 'authorization', 'security'];
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** frontmatter と本文を分離する。 */
export function splitFrontmatter(markdown, source) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`${source}: frontmatter (--- で囲まれたブロック) が見つかりません`);
  }
  const data = yaml.load(match[1]);
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${source}: frontmatter は key: value の形式で記述してください`);
  }
  return { data, body: match[2] };
}

/**
 * published_at を ISO 8601 文字列に正規化する。
 * 未設定なら null を返し、サイト上では日付を表示しない。
 */
export function normalizePublishedAt(value, source) {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${source}: published_at "${value}" を日時として解釈できません`);
  }
  return date.toISOString();
}

export function assertStringArray(value, key, source) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${source}: ${key} は文字列の配列で指定してください`);
  }
  return value;
}

/** 本文から Markdown 記法を落として抜粋テキストを作る。 */
export function toExcerpt(body, length = 140) {
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^:::[\s\S]*?$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>|-]/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
}

function parseArticle(fileName) {
  const slug = fileName.replace(/\.md$/, '');
  const source = `articles/${fileName}`;

  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`${source}: ファイル名は英小文字・数字・ハイフンのみで指定してください`);
  }

  const { data, body } = splitFrontmatter(readFileSync(join(articlesDir, fileName), 'utf-8'), source);

  if (data.published !== true) return null;

  if (typeof data.title !== 'string' || data.title.trim() === '') {
    throw new Error(`${source}: title は必須です`);
  }

  const targetCategories = assertStringArray(data.targetCategories, 'targetCategories', source);
  const unknown = targetCategories.filter((c) => !TARGET_CATEGORIES.includes(c));
  if (unknown.length > 0) {
    throw new Error(
      `${source}: targetCategories に未知の値 ${unknown.join(', ')} が含まれています` +
        `（指定できるのは ${TARGET_CATEGORIES.join(', ')}）`
    );
  }

  const topics = assertStringArray(data.topics, 'topics', source);

  return {
    meta: {
      slug,
      title: data.title.trim(),
      emoji: typeof data.emoji === 'string' && data.emoji.trim() !== '' ? data.emoji.trim() : '📝',
      topics,
      targetCategories,
      publishedAt: normalizePublishedAt(data.published_at, source),
      excerpt: toExcerpt(body),
    },
    html: markdownToHtml(body, { embedOrigin: EMBED_ORIGIN }),
  };
}

/** 公開日の新しい順。日付未設定の記事は末尾に slug 昇順で並べる。 */
export function compareArticles(a, b) {
  if (a.publishedAt && b.publishedAt) {
    if (a.publishedAt !== b.publishedAt) return a.publishedAt < b.publishedAt ? 1 : -1;
  } else if (a.publishedAt !== b.publishedAt) {
    return a.publishedAt ? -1 : 1;
  }
  return a.slug.localeCompare(b.slug);
}

function buildArticles() {
  const fileNames = readdirSync(articlesDir)
    .filter((name) => name.endsWith('.md'))
    .sort();

  const articles = [];
  let draftCount = 0;

  rmSync(articlesOutDir, { recursive: true, force: true });
  mkdirSync(htmlOutDir, { recursive: true });

  for (const fileName of fileNames) {
    const parsed = parseArticle(fileName);
    if (!parsed) {
      draftCount += 1;
      continue;
    }
    writeFileSync(join(htmlOutDir, `${parsed.meta.slug}.html`), parsed.html);
    articles.push(parsed.meta);
  }

  articles.sort(compareArticles);
  writeFileSync(join(articlesOutDir, 'index.json'), `${JSON.stringify(articles, null, 2)}\n`);

  console.log(`[content] 記事 ${articles.length} 本を生成しました（下書き ${draftCount} 本は除外）`);
}

function buildLegal() {
  mkdirSync(legalOutDir, { recursive: true });
  for (const fileName of readdirSync(legalContentDir).filter((name) => name.endsWith('.md'))) {
    const name = fileName.replace(/\.md$/, '');
    const html = markdownToHtml(readFileSync(join(legalContentDir, fileName), 'utf-8'), {
      embedOrigin: EMBED_ORIGIN,
    });
    writeFileSync(
      join(legalOutDir, `${name}.ts`),
      `// prepare-content.mjs による生成ファイル。直接編集しないでください。\nexport const htmlContent = ${JSON.stringify(html)};\n`
    );
  }
  console.log('[content] 規約ページの HTML を生成しました');
}

function syncImages() {
  rmSync(publicImagesDir, { recursive: true, force: true });
  mkdirSync(publicImagesDir, { recursive: true });
  cpSync(imagesDir, publicImagesDir, { recursive: true });
  console.log('[content] images/ を public/images/ へ同期しました');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildArticles();
  buildLegal();
  syncImages();
}
