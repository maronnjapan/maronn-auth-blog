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

export class NotificationNotFoundError extends AppError {
  readonly code = 'NOTIFICATION_NOT_FOUND';
  readonly statusCode = 404;

  constructor(notificationId: string) {
    super(`Notification not found: ${notificationId}`);
  }
}

export class InvalidWebhookSignatureError extends AppError {
  readonly code = 'INVALID_WEBHOOK_SIGNATURE';
  readonly statusCode = 401;

  constructor() {
    super('Invalid webhook signature');
  }
}

export class InvalidAvatarTypeError extends AppError {
  readonly code = 'INVALID_AVATAR_TYPE';
  readonly statusCode = 400;

  constructor(contentType: string) {
    super(`Unsupported avatar type: ${contentType}. Allowed: jpg, png, webp`);
  }
}

export class AvatarSizeLimitExceededError extends AppError {
  readonly code = 'AVATAR_SIZE_LIMIT_EXCEEDED';
  readonly statusCode = 400;

  constructor(size: number, maxSize: number) {
    super(`Avatar size ${size} bytes exceeds maximum ${maxSize} bytes`);
  }
}

export class RepositoryNotAccessibleError extends AppError {
  readonly code = 'REPOSITORY_NOT_ACCESSIBLE';
  readonly statusCode = 400;

  constructor(repoFullName: string) {
    super(`Repository not accessible: ${repoFullName}`);
  }
}

export class RepositoryAlreadyLinkedByOtherUserError extends AppError {
  readonly code = 'REPOSITORY_ALREADY_LINKED_BY_OTHER_USER';
  readonly statusCode = 409;

  constructor(repoFullName: string) {
    super(`Repository ${repoFullName} is already linked by another user`);
  }
}

export class CommentNotFoundError extends AppError {
  readonly code = 'COMMENT_NOT_FOUND';
  readonly statusCode = 404;

  constructor(commentId: string) {
    super(`Comment not found: ${commentId}`);
  }
}

export class UnauthorizedArticleAccessError extends AppError {
  readonly code = 'UNAUTHORIZED_ARTICLE_ACCESS';
  readonly statusCode = 403;

  constructor(articleId: string) {
    super(`Not authorized to access article: ${articleId}`);
  }
}

export class CannotFollowSelfError extends AppError {
  readonly code = 'CANNOT_FOLLOW_SELF';
  readonly statusCode = 400;

  constructor() {
    super('Cannot follow yourself');
  }
}

export class AlreadyFollowingError extends AppError {
  readonly code = 'ALREADY_FOLLOWING';
  readonly statusCode = 409;

  constructor(followingId: string) {
    super(`Already following user: ${followingId}`);
  }
}

export class FollowNotFoundError extends AppError {
  readonly code = 'FOLLOW_NOT_FOUND';
  readonly statusCode = 404;

  constructor(followingId: string) {
    super(`Not following user: ${followingId}`);
  }
}
