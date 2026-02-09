import { optimizeImage } from 'wasm-image-optimization';

/** Quality settings for each image format (0–100) */
const QUALITY_JPEG = 80;
const QUALITY_WEBP = 80;
const QUALITY_PNG = 80;

type ImageFormat = 'jpeg' | 'png' | 'webp';

/**
 * Map a MIME content-type to a format understood by wasm-image-optimization.
 * Returns `null` for types that should not be optimized (e.g. GIF).
 */
function resolveFormat(contentType: string): ImageFormat | null {
  if (contentType.startsWith('image/jpeg')) return 'jpeg';
  if (contentType.startsWith('image/png')) return 'png';
  if (contentType.startsWith('image/webp')) return 'webp';
  return null; // GIF etc. – skip optimization
}

function qualityForFormat(format: ImageFormat): number {
  switch (format) {
    case 'jpeg':
      return QUALITY_JPEG;
    case 'webp':
      return QUALITY_WEBP;
    case 'png':
      return QUALITY_PNG;
  }
}

export interface OptimizeResult {
  /** Optimised image data (or original data when optimisation was skipped). */
  data: ArrayBuffer;
  /** Content-type that should be stored (unchanged from input). */
  contentType: string;
}

/**
 * Optimise an image using WASM-based encoders.
 *
 * - JPEG → re-encoded with mozjpeg at quality 80
 * - PNG  → re-encoded at quality 80
 * - WebP → re-encoded at quality 80
 * - GIF  → returned as-is (animated frames not supported by the encoder)
 *
 * The output format matches the input format, so URLs and content-types
 * stay consistent.
 */
export async function optimizeImageData(
  data: ArrayBuffer,
  contentType: string,
): Promise<OptimizeResult> {
  const format = resolveFormat(contentType);

  // Skip unsupported formats (GIF, etc.)
  if (!format) {
    return { data, contentType };
  }

  try {
    const optimized = await optimizeImage({
      image: data,
      quality: qualityForFormat(format),
      format,
    });

    // optimizeImage may return undefined on failure
    if (!optimized) {
      return { data, contentType };
    }

    // Only use the optimised version if it is actually smaller
    if (optimized.byteLength < data.byteLength) {
      return { data: optimized.buffer as ArrayBuffer, contentType };
    }

    return { data, contentType };
  } catch (error) {
    // If optimisation fails, fall back to the original image silently.
    // The image was already validated, so we can safely store it as-is.
    console.warn('[ImageOptimizer] Optimization failed, using original image', error);
    return { data, contentType };
  }
}
