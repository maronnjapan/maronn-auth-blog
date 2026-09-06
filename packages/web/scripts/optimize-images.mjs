/**
 * 記事の画像を WebP に変換し、img タグに寸法とデコードヒントを付けるビルド処理。
 *
 * 元画像 (images/) は編集用の原本として残し、配信するのは変換後の WebP だけ。
 * 記事から参照されていない画像は配信対象に含めない。
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import sharp from 'sharp';

/** 本文の表示幅 (約 736px) の 2 倍。これを超える画像は縮小する。 */
const MAX_WIDTH = 1600;

/**
 * 可逆圧縮が非可逆より十分小さいか近い場合は可逆を採る。
 * スクリーンショットの文字を滲ませないための余裕分。
 */
const LOSSLESS_TOLERANCE = 1.15;

const CONVERTIBLE = new Set(['.png', '.jpg', '.jpeg', '.gif']);

/** HTML 内の src 属性 (URL エンコード済み) を実ファイルの相対パスに戻す。 */
export function srcToRelativePath(src) {
  return decodeURIComponent(src).replace(/^\/+/, '');
}

/** 画像の src を WebP のものに差し替える。拡張子以外は元の表記を保つ。 */
export function toWebpSrc(src) {
  return src.replace(/\.(png|jpe?g|gif)$/i, '.webp');
}

async function encode(inputPath, animated) {
  const load = () => sharp(inputPath, { animated, limitInputPixels: false });

  const metadata = await load().metadata();
  const width = metadata.width ?? 0;
  const needsResize = width > MAX_WIDTH;

  const pipeline = () => {
    const image = load();
    return needsResize ? image.resize({ width: MAX_WIDTH, withoutEnlargement: true }) : image;
  };

  // アニメーションは可逆にすると激増するので非可逆のみ試す
  const lossy = await pipeline().webp({ quality: animated ? 75 : 85, effort: 4 }).toBuffer();
  if (animated) return { buffer: lossy, resized: needsResize };

  const lossless = await pipeline().webp({ lossless: true, effort: 4 }).toBuffer();
  const buffer = lossless.length <= lossy.length * LOSSLESS_TOLERANCE ? lossless : lossy;
  return { buffer, resized: needsResize };
}

/**
 * 1 枚の画像を WebP として出力し、HTML に書き戻すための情報を返す。
 * 変換できない・変換しても小さくならない場合は元画像をそのまま配信する。
 */
export async function optimizeImage(sourcePath, outputDir, relativePath) {
  const extension = extname(relativePath).toLowerCase();
  const original = readFileSync(sourcePath);

  const writeOut = (target, buffer) => {
    const outPath = join(outputDir, target);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, buffer);
    return outPath;
  };

  if (!CONVERTIBLE.has(extension)) {
    writeOut(relativePath, original);
    return { relativePath, converted: false, originalBytes: original.length, bytes: original.length };
  }

  const animated = extension === '.gif';

  try {
    const { buffer } = await encode(sourcePath, animated);
    const dimensions = await sharp(buffer, { animated, limitInputPixels: false }).metadata();
    const height = dimensions.pageHeight ?? dimensions.height;

    if (buffer.length >= original.length) {
      // 変換しても小さくならない画像は元のまま配信する
      writeOut(relativePath, original);
      const originalMeta = await sharp(sourcePath, { animated, limitInputPixels: false }).metadata();
      return {
        relativePath,
        converted: false,
        width: originalMeta.width,
        height: originalMeta.pageHeight ?? originalMeta.height,
        originalBytes: original.length,
        bytes: original.length,
      };
    }

    const webpPath = toWebpSrc(relativePath);
    writeOut(webpPath, buffer);
    return {
      relativePath: webpPath,
      converted: true,
      width: dimensions.width,
      height,
      originalBytes: original.length,
      bytes: buffer.length,
    };
  } catch (error) {
    console.warn(`[content] 画像を変換できなかったため元のまま配信します: ${relativePath} (${error.message})`);
    writeOut(relativePath, original);
    return { relativePath, converted: false, originalBytes: original.length, bytes: original.length };
  }
}

/** HTML の img タグを走査して src を差し替え、寸法と読み込みヒントを付ける。 */
export function rewriteImageTags(html, resolve) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\ssrc="(\/images\/[^"]+)"/i);
    if (!srcMatch) return tag;

    const info = resolve(srcMatch[1]);
    if (!info) return tag;

    let rewritten = tag.replace(srcMatch[0], ` src="${info.src}"`);

    if (info.width && info.height && !/\swidth=/i.test(rewritten)) {
      rewritten = rewritten.replace(/<img\b/i, `<img width="${info.width}" height="${info.height}"`);
    }
    if (!/\sloading=/i.test(rewritten)) {
      rewritten = rewritten.replace(/<img\b/i, '<img loading="lazy"');
    }
    if (!/\sdecoding=/i.test(rewritten)) {
      rewritten = rewritten.replace(/<img\b/i, '<img decoding="async"');
    }
    return rewritten;
  });
}
