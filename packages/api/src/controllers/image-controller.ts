import { Hono } from 'hono';
import type { Env } from '../types/env';
import { R2Client } from '../infrastructure/storage/r2-client';
import { NotFoundError } from '@maronn-auth-blog/shared';

const app = new Hono<{ Bindings: Env }>();

// GET /images/comment-images/:userId/:filename - Get comment image from R2
app.get('/comment-images/:userId/:filename', async (c) => {
  const userId = c.req.param('userId');
  const filename = c.req.param('filename');

  const key = `comment-images/${userId}/${filename}`;
  const object = await c.env.R2.get(key);

  if (!object) {
    throw new NotFoundError('Image', filename);
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

// GET /images/:userId/:slug/:filename - Get image from R2
app.get('/:userId/:slug/:filename', async (c) => {
  const userId = c.req.param('userId');
  const slug = c.req.param('slug');
  const filename = c.req.param('filename');

  const r2Client = new R2Client(c.env.R2);
  const object = await r2Client.getImage(userId, slug, filename);

  if (!object) {
    throw new NotFoundError('Image', filename);
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

export default app;
