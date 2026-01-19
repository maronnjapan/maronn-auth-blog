import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { R2Client } from '../infrastructure/storage/r2-client';
import { UploadAvatarUsecase } from '../usecases/user/upload-avatar';
import { NotFoundError, ValidationError } from '@maronn-auth-blog/shared';

const app = new Hono<{ Bindings: Env }>();

// POST /avatars/upload - Upload avatar
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
