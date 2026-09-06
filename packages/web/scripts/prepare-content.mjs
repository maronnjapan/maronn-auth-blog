/**
 * ビルド前のコンテンツ準備スクリプト。
 *
 * - リポジトリ直下の articles/*.md を読み、frontmatter を検証して HTML に変換する
 * - リポジトリ直下の images/ を web パッケージの public/images/ へ同期する
 * - src/content/legal/*.md を HTML に変換する
 *
 * 出力先の src/generated/ と public/images/ は .gitignore 済み（生成物）。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import yaml from 'js-yaml';
import { loadWebEnv } from './load-env.mjs';
import { optimizeImage, rewriteImageTags, srcToRelativePath, toWebpSrc } from './optimize-images.mjs';
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
const imageManifestPath = join(generatedDir, 'image-manifest.json');
const publicDir = join(webDir, 'public');
const publicImagesDir = join(publicDir, 'images');

loadWebEnv();

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

/** 記事 HTML から参照している画像の src を集める。 */
function collectImageSources(htmlByslug) {
  const sources = new Set();
  for (const html of htmlByslug.values()) {
    for (const match of html.matchAll(/<img\b[^>]*\ssrc="(\/images\/[^"]+)"/gi)) {
      sources.add(match[1]);
    }
  }
  return [...sources];
}

/** CPU 数に合わせて並列実行する。sharp の変換が律速なので無制限には走らせない。 */
async function mapWithConcurrency(items, worker) {
  const limit = Math.max(1, Math.min(availableParallelism(), 8));
  const results = new Array(items.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index]);
      }
    })
  );

  return results;
}

/**
 * 参照されている画像だけを WebP に変換して public/images/ へ出力し、
 * 記事 HTML の img タグを書き換える。
 */
async function buildImages(htmlBySlug) {
  const sources = collectImageSources(htmlBySlug);

  // 前回の変換結果。元画像が変わっていなければ再変換を省く（開発時の待ち時間対策）。
  const cache = existsSync(imageManifestPath)
    ? JSON.parse(readFileSync(imageManifestPath, 'utf-8'))
    : {};
  const manifest = {};

  const results = await mapWithConcurrency(sources, async (src) => {
    const relativePath = srcToRelativePath(src);
    const sourcePath = join(repoRoot, relativePath);

    if (!existsSync(sourcePath)) {
      throw new Error(`記事が参照している画像が見つかりません: ${src}`);
    }

    const { mtimeMs, size } = statSync(sourcePath);
    const cached = cache[relativePath];
    if (
      cached &&
      cached.mtimeMs === mtimeMs &&
      cached.size === size &&
      existsSync(join(publicDir, cached.outputPath))
    ) {
      return { src, relativePath, result: cached, reused: true };
    }

    const result = await optimizeImage(sourcePath, publicDir, relativePath);
    return {
      src,
      relativePath,
      result: {
        outputPath: result.relativePath,
        converted: result.converted,
        width: result.width,
        height: result.height,
        originalBytes: result.originalBytes,
        bytes: result.bytes,
        mtimeMs,
        size,
      },
      reused: false,
    };
  });

  const infoBySrc = new Map();
  const expectedOutputs = new Set();
  let originalTotal = 0;
  let outputTotal = 0;
  let converted = 0;
  let reusedCount = 0;

  for (const { src, relativePath, result, reused } of results) {
    manifest[relativePath] = result;
    expectedOutputs.add(result.outputPath);
    originalTotal += result.originalBytes;
    outputTotal += result.bytes;
    if (result.converted) converted += 1;
    if (reused) reusedCount += 1;

    infoBySrc.set(src, {
      src: result.converted ? toWebpSrc(src) : src,
      width: result.width,
      height: result.height,
    });
  }

  pruneUnusedImages(expectedOutputs);
  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(imageManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const toMb = (bytes) => (bytes / 1024 / 1024).toFixed(1);
  console.log(
    `[content] 画像 ${sources.length} 枚を配信用に生成しました` +
      `（WebP 変換 ${converted} 枚、${toMb(originalTotal)}MB → ${toMb(outputTotal)}MB` +
      `${reusedCount > 0 ? `、うち ${reusedCount} 枚は変換済みを再利用` : ''}）`
  );

  return (src) => infoBySrc.get(src);
}

/** 記事から参照されなくなった配信用画像を消す。 */
function pruneUnusedImages(expectedOutputs) {
  if (!existsSync(publicImagesDir)) return;

  for (const entry of readdirSync(publicImagesDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const outputPath = join(entry.parentPath, entry.name).slice(publicDir.length + 1);
    if (!expectedOutputs.has(outputPath)) {
      rmSync(join(publicDir, outputPath), { force: true });
    }
  }
}

async function buildArticles() {
  const fileNames = readdirSync(articlesDir)
    .filter((name) => name.endsWith('.md'))
    .sort();

  const articles = [];
  const htmlBySlug = new Map();
  let draftCount = 0;

  for (const fileName of fileNames) {
    const parsed = parseArticle(fileName);
    if (!parsed) {
      draftCount += 1;
      continue;
    }
    htmlBySlug.set(parsed.meta.slug, parsed.html);
    articles.push(parsed.meta);
  }

  const resolveImage = await buildImages(htmlBySlug);

  rmSync(articlesOutDir, { recursive: true, force: true });
  mkdirSync(htmlOutDir, { recursive: true });

  for (const [slug, html] of htmlBySlug) {
    writeFileSync(join(htmlOutDir, `${slug}.html`), rewriteImageTags(html, resolveImage));
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildArticles();
  buildLegal();
}
