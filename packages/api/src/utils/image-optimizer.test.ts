import { describe, it, expect, vi, beforeEach } from 'vitest';
import { optimizeImageData } from './image-optimizer';

// Mock wasm-image-optimization
vi.mock('wasm-image-optimization', () => ({
  optimizeImage: vi.fn(),
}));

import { optimizeImage } from 'wasm-image-optimization';
const mockOptimizeImage = vi.mocked(optimizeImage);

function createBuffer(size: number): ArrayBuffer {
  return new ArrayBuffer(size);
}

function createSmallerUint8Array(original: ArrayBuffer): Uint8Array<ArrayBuffer> {
  // Return a Uint8Array that is half the size of the original
  return new Uint8Array(new ArrayBuffer(Math.floor(original.byteLength / 2)));
}

function createLargerUint8Array(original: ArrayBuffer): Uint8Array<ArrayBuffer> {
  // Return a Uint8Array that is larger than the original
  return new Uint8Array(new ArrayBuffer(original.byteLength * 2));
}

describe('optimizeImageData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('optimizes JPEG images with quality 80', async () => {
    const input = createBuffer(100 * 1024); // 100 KB
    const optimized = createSmallerUint8Array(input);
    mockOptimizeImage.mockResolvedValue(optimized);

    const result = await optimizeImageData(input, 'image/jpeg');

    expect(mockOptimizeImage).toHaveBeenCalledWith({
      image: input,
      quality: 80,
      format: 'jpeg',
    });
    expect(result.data).toBe(optimized.buffer);
    expect(result.contentType).toBe('image/jpeg');
  });

  it('optimizes PNG images with quality 80', async () => {
    const input = createBuffer(100 * 1024);
    const optimized = createSmallerUint8Array(input);
    mockOptimizeImage.mockResolvedValue(optimized);

    const result = await optimizeImageData(input, 'image/png');

    expect(mockOptimizeImage).toHaveBeenCalledWith({
      image: input,
      quality: 80,
      format: 'png',
    });
    expect(result.data).toBe(optimized.buffer);
    expect(result.contentType).toBe('image/png');
  });

  it('optimizes WebP images with quality 80', async () => {
    const input = createBuffer(100 * 1024);
    const optimized = createSmallerUint8Array(input);
    mockOptimizeImage.mockResolvedValue(optimized);

    const result = await optimizeImageData(input, 'image/webp');

    expect(mockOptimizeImage).toHaveBeenCalledWith({
      image: input,
      quality: 80,
      format: 'webp',
    });
    expect(result.data).toBe(optimized.buffer);
    expect(result.contentType).toBe('image/webp');
  });

  it('skips GIF images (returns original)', async () => {
    const input = createBuffer(100 * 1024);

    const result = await optimizeImageData(input, 'image/gif');

    expect(mockOptimizeImage).not.toHaveBeenCalled();
    expect(result.data).toBe(input);
    expect(result.contentType).toBe('image/gif');
  });

  it('optimizes small images (under 10 KB)', async () => {
    const input = createBuffer(5 * 1024); // 5 KB
    const optimized = createSmallerUint8Array(input);
    mockOptimizeImage.mockResolvedValue(optimized);

    const result = await optimizeImageData(input, 'image/jpeg');

    expect(mockOptimizeImage).toHaveBeenCalledWith({
      image: input,
      quality: 80,
      format: 'jpeg',
    });
    expect(result.data).toBe(optimized.buffer);
    expect(result.contentType).toBe('image/jpeg');
  });

  it('returns original when optimized version is larger', async () => {
    const input = createBuffer(100 * 1024);
    const larger = createLargerUint8Array(input);
    mockOptimizeImage.mockResolvedValue(larger);

    const result = await optimizeImageData(input, 'image/jpeg');

    expect(mockOptimizeImage).toHaveBeenCalled();
    expect(result.data).toBe(input);
    expect(result.contentType).toBe('image/jpeg');
  });

  it('returns original when optimizeImage returns undefined', async () => {
    const input = createBuffer(100 * 1024);
    mockOptimizeImage.mockResolvedValue(undefined as unknown as Uint8Array<ArrayBuffer>);

    const result = await optimizeImageData(input, 'image/jpeg');

    expect(result.data).toBe(input);
    expect(result.contentType).toBe('image/jpeg');
  });

  it('returns original when optimization throws an error', async () => {
    const input = createBuffer(100 * 1024);
    mockOptimizeImage.mockRejectedValue(new Error('WASM failure'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await optimizeImageData(input, 'image/png');

    expect(result.data).toBe(input);
    expect(result.contentType).toBe('image/png');
    expect(consoleSpy).toHaveBeenCalledWith(
      '[ImageOptimizer] Optimization failed, using original image',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('handles content-type with parameters (e.g. image/jpeg; charset=utf-8)', async () => {
    const input = createBuffer(100 * 1024);
    const optimized = createSmallerUint8Array(input);
    mockOptimizeImage.mockResolvedValue(optimized);

    const result = await optimizeImageData(input, 'image/jpeg; charset=utf-8');

    expect(mockOptimizeImage).toHaveBeenCalledWith({
      image: input,
      quality: 80,
      format: 'jpeg',
    });
    expect(result.data).toBe(optimized.buffer);
    expect(result.contentType).toBe('image/jpeg; charset=utf-8');
  });

  it('skips unknown content types', async () => {
    const input = createBuffer(100 * 1024);

    const result = await optimizeImageData(input, 'image/svg+xml');

    expect(mockOptimizeImage).not.toHaveBeenCalled();
    expect(result.data).toBe(input);
    expect(result.contentType).toBe('image/svg+xml');
  });
});
