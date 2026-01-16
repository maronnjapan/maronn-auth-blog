import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../types/env';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { RepositoryRepository } from '../infrastructure/repositories/repository-repository';
import { requireAuth } from '../middleware/auth';
import { NotFoundError, ForbiddenError, UnauthorizedError } from '@maronn-auth-blog/shared';
import { userInputSchema, repositoryInputSchema } from '@maronn-auth-blog/shared';

const app = new Hono<{ Bindings: Env }>();

// GET /users/:username - Get user by username
app.get('/:username', async (c) => {
  const username = c.req.param('username');
  const userRepo = new UserRepository(c.env.DB);

  const user = await userRepo.findByUsername(username);
  if (!user) {
    throw new NotFoundError('User', username);
  }

  return c.json(user.toJSON());
});

// PUT /users/me - Update current user profile
app.put(
  '/me',
  requireAuth(),
  zValidator('json', userInputSchema.partial()),
  async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new UnauthorizedError();
    }

    const updates = c.req.valid('json');
    const userRepo = new UserRepository(c.env.DB);

    const user = await userRepo.findById(auth.userId);
    if (!user) {
      throw new NotFoundError('User', auth.userId);
    }

    user.updateProfile(updates);
    await userRepo.save(user);

    return c.json(user.toJSON());
  }
);

// GET /users/me/repository - Get linked repository
app.get('/me/repository', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const repoRepo = new RepositoryRepository(c.env.DB);
  const repository = await repoRepo.findByUserId(auth.userId);

  if (!repository) {
    return c.json(null);
  }

  return c.json(repository);
});

// PUT /users/me/repository - Link repository
app.put(
  '/me/repository',
  requireAuth(),
  zValidator('json', repositoryInputSchema),
  async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new UnauthorizedError();
    }

    const { githubRepoFullName } = c.req.valid('json');
    const repoRepo = new RepositoryRepository(c.env.DB);

    await repoRepo.save(auth.userId, githubRepoFullName);

    const repository = await repoRepo.findByUserId(auth.userId);
    return c.json(repository);
  }
);

// DELETE /users/me/repository - Unlink repository
app.delete('/me/repository', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const repoRepo = new RepositoryRepository(c.env.DB);
  await repoRepo.delete(auth.userId);

  return c.json({ success: true });
});

export default app;
