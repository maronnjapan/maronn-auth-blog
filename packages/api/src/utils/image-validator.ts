import { InvalidImageError, ImageSizeLimitExceededError, TooManyImagesError } from '../domain/errors/domain-errors';

const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3 MB
const MAX_IMAGES_PER_ARTICLE = 20;
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export function validateImageCount(count: number): void {
  if (count > MAX_IMAGES_PER_ARTICLE) {
    throw new TooManyImagesError(count, MAX_IMAGES_PER_ARTICLE);
  }
}

export function validateImageContentType(contentType: string): void {
  if (!ALLOWED_CONTENT_TYPES.some((type) => contentType.startsWith(type))) {
    throw new InvalidImageError(`Unsupported content type: ${contentType}`);
  }
}

export function validateImageSize(size: number): void {
  if (size > MAX_IMAGE_SIZE) {
    throw new ImageSizeLimitExceededError(size, MAX_IMAGE_SIZE);
  }
}

export function getImageFilename(path: string): string {
  return path.replace(/^\.\/images\//, '');
}
