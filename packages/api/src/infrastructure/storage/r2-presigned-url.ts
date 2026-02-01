import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface R2PresignedUrlConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_COMMENT_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_COMMENT_IMAGE_SIZE = 3 * 1024 * 1024; // 3 MB

const DEFAULT_EXPIRES_IN = 300; // 5 minutes

export class R2PresignedUrlClient {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(config: R2PresignedUrlConfig) {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucketName = config.bucketName;
  }

  async generateAvatarUploadUrl(
    userId: string,
    filename: string,
    contentType: string,
    contentLength: number
  ): Promise<PresignedUrlResult> {
    // Validate content type
    if (!ALLOWED_AVATAR_TYPES.includes(contentType)) {
      throw new Error(
        `Unsupported avatar type: ${contentType}. Allowed: ${ALLOWED_AVATAR_TYPES.join(', ')}`
      );
    }

    // Validate size
    if (contentLength > MAX_AVATAR_SIZE) {
      throw new Error(
        `Avatar size ${contentLength} bytes exceeds maximum ${MAX_AVATAR_SIZE} bytes (2MB)`
      );
    }

    // Generate unique filename with timestamp
    const ext = filename.split('.').pop() || 'png';
    const uniqueFilename = `${Date.now()}.${ext}`;
    const key = `avatars/${userId}/${uniqueFilename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: DEFAULT_EXPIRES_IN,
    });

    return {
      uploadUrl,
      key,
      expiresIn: DEFAULT_EXPIRES_IN,
    };
  }

  async generateCommentImageUploadUrl(
    userId: string,
    filename: string,
    contentType: string,
    contentLength: number
  ): Promise<PresignedUrlResult> {
    // Validate content type
    if (!ALLOWED_COMMENT_IMAGE_TYPES.includes(contentType)) {
      throw new Error(
        `Unsupported image type: ${contentType}. Allowed: ${ALLOWED_COMMENT_IMAGE_TYPES.join(', ')}`
      );
    }

    // Validate size
    if (contentLength > MAX_COMMENT_IMAGE_SIZE) {
      throw new Error(
        `Image size ${contentLength} bytes exceeds maximum ${MAX_COMMENT_IMAGE_SIZE} bytes (3MB)`
      );
    }

    // Generate unique filename with UUID
    const ext = filename.split('.').pop() || 'png';
    const uniqueFilename = `${crypto.randomUUID()}.${ext}`;
    const key = `comment-images/${userId}/${uniqueFilename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: DEFAULT_EXPIRES_IN,
    });

    return {
      uploadUrl,
      key,
      expiresIn: DEFAULT_EXPIRES_IN,
    };
  }
}

export function createR2PresignedUrlClient(env: {
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
}): R2PresignedUrlClient {
  return new R2PresignedUrlClient({
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
  });
}
