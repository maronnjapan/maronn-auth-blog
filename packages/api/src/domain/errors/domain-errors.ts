import { AppError } from '@maronn-auth-blog/shared';

export class UserNotFoundError extends AppError {
  readonly code = 'USER_NOT_FOUND';
  readonly statusCode = 404;

  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}

export class ArticleNotFoundError extends AppError {
  readonly code = 'ARTICLE_NOT_FOUND';
  readonly statusCode = 404;

  constructor(articleId: string) {
    super(`Article not found: ${articleId}`);
  }
}

export class InvalidStatusTransitionError extends AppError {
  readonly code = 'INVALID_STATUS_TRANSITION';
  readonly statusCode = 400;

  constructor(from: string, to: string) {
    super(`Cannot transition from ${from} to ${to}`);
  }
}

export class RepositoryAlreadyLinkedError extends AppError {
  readonly code = 'REPOSITORY_ALREADY_LINKED';
  readonly statusCode = 409;

  constructor(userId: string) {
    super(`User ${userId} already has a linked repository`);
  }
}

export class RepositoryNotFoundError extends AppError {
  readonly code = 'REPOSITORY_NOT_FOUND';
  readonly statusCode = 404;

  constructor(userId: string) {
    super(`Repository not found for user: ${userId}`);
  }
}

export class DuplicateSlugError extends AppError {
  readonly code = 'DUPLICATE_SLUG';
  readonly statusCode = 409;

  constructor(slug: string, userId: string) {
    super(`Article with slug "${slug}" already exists for user ${userId}`);
  }
}

export class InvalidImageError extends AppError {
  readonly code = 'INVALID_IMAGE';
  readonly statusCode = 400;

  constructor(reason: string) {
    super(`Invalid image: ${reason}`);
  }
}

export class ImageSizeLimitExceededError extends AppError {
  readonly code = 'IMAGE_SIZE_LIMIT_EXCEEDED';
  readonly statusCode = 400;

  constructor(size: number, maxSize: number) {
    super(`Image size ${size} bytes exceeds maximum ${maxSize} bytes`);
  }
}

export class TooManyImagesError extends AppError {
  readonly code = 'TOO_MANY_IMAGES';
  readonly statusCode = 400;

  constructor(count: number, maxCount: number) {
    super(`Article has ${count} images, maximum is ${maxCount}`);
  }
}
