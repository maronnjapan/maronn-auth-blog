import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { R2Client } from '../infrastructure/storage/r2-client';
import { createR2PresignedUrlClient } from '../infrastructure/storage/r2-presigned-url';
import { UploadAvatarUsecase } from '../usecases/user/upload-avatar';
import { NotFoundError, ValidationError } from '@maronn-auth-blog/shared';

const app = new Hono<{ Bindings: Env }>();

// Schema for signed URL request
const signedUrlRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  contentLength: z.number().int().positive(),
});

// Schema for confirming upload
const confirmUploadSchema = z.object({
  key: z.string().min(1),
});

// POST /avatars/upload-url - Get signed URL for avatar upload
app.post(
  '/upload-url',
  requireAuth(),
  zValidator('json', signedUrlRequestSchema),
  async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new ValidationError('Unauthorized');
    }

    const { filename, contentType, contentLength } = c.req.valid('json');

    const presignedUrlClient = createR2PresignedUrlClient(c.env);

    try {
      const result = await presignedUrlClient.generateAvatarUploadUrl(
        auth.userId,
        filename,
        contentType,
        contentLength
      );

      // Return the signed URL and key (for confirmation)
      return c.json({
        uploadUrl: result.uploadUrl,
        key: result.key,
        expiresIn: result.expiresIn,
        publicUrl: `${c.env.IMAGE_URL}/${result.key}`,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  }
);

// POST /avatars/confirm - Confirm avatar upload and update user profile
app.post(
  '/confirm',
  requireAuth(),
  zValidator('json', confirmUploadSchema),
  async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new ValidationError('Unauthorized');
    }

    const { key } = c.req.valid('json');

    // Validate that the key belongs to this user
    const expectedPrefix = `avatars/${auth.userId}/`;
    if (!key.startsWith(expectedPrefix)) {
      throw new ValidationError('Invalid avatar key');
    }

    // Verify the file exists in R2
    const object = await c.env.R2.head(key);
    if (!object) {
      throw new ValidationError('Avatar not found. Please upload the file first.');
    }

    // Update user icon_url
    const userRepo = new UserRepository(c.env.DB);
    const user = await userRepo.findById(auth.userId);
    if (!user) {
      throw new NotFoundError('User', auth.userId);
    }

    const avatarUrl = `${c.env.IMAGE_URL}/${key}`;
    user.updateProfile({ iconUrl: avatarUrl });
    await userRepo.save(user);

    console.info(`[AvatarConfirm] Updated avatar for user: ${auth.userId}`);

    return c.json({ avatarUrl });
  }
);

// POST /avatars/upload - Upload avatar (legacy, server-side upload)
app.post('/upload', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new ValidationError('Unauthorized');
  }

  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    throw new ValidationError('No file provided');
  }

  // file is now File type in Workers environment
  const uploadFile = file as File;

  const userRepo = new UserRepository(c.env.DB);
  const r2Client = new R2Client(c.env.R2);

  const usecase = new UploadAvatarUsecase(userRepo, r2Client);
  const result = await usecase.execute({
    userId: auth.userId,
    file: uploadFile,
    imageUrl: c.env.IMAGE_URL,
  });

  return c.json(result);
});

// GET /avatars/:userId/:filename - Get avatar from R2
app.get('/:userId/:filename', async (c) => {
  const userId = c.req.param('userId');
  const filename = c.req.param('filename');

  const r2Client = new R2Client(c.env.R2);
  const object = await r2Client.getAvatar(userId, filename);

  if (!object) {
    throw new NotFoundError('Avatar', filename);
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

export default app;
