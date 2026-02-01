import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types/env';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { RepositoryRepository } from '../infrastructure/repositories/repository-repository';
import { requireAuth } from '../middleware/auth';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '@maronn-auth-blog/shared';
import { userInputSchema, repositoryInputSchema } from '@maronn-auth-blog/shared';
import { GitHubClient } from '../infrastructure/github-client';
import { ValidateRepositoryUsecase } from '../usecases/repository/validate-repository';

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

// GET /users/:username/stats - Get user's article stats
app.get('/:username/stats', async (c) => {
  const username = c.req.param('username');
  const userRepo = new UserRepository(c.env.DB);

  const user = await userRepo.findByUsername(username);
  if (!user) {
    throw new NotFoundError('User', username);
  }

  const stats = await userRepo.getArticleStats(user.id);

  return c.json({ stats });
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

    if (updates.username && updates.username !== user.username) {
      const existingUser = await userRepo.findByUsername(updates.username);
      if (existingUser && existingUser.id !== user.id) {
        throw new ConflictError('Username is already in use');
      }
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

// POST /users/me/repository/validate - Validate repository before linking
app.post(
  '/me/repository/validate',
  requireAuth(),
  zValidator('json', repositoryInputSchema),
  async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new UnauthorizedError();
    }

    const { githubRepoFullName } = c.req.valid('json');
    const userRepo = new UserRepository(c.env.DB);
    const repoRepo = new RepositoryRepository(c.env.DB);

    const user = await userRepo.findById(auth.userId);
    if (!user) {
      throw new NotFoundError('User', auth.userId);
    }

    if (!user.githubInstallationId) {
      throw new ValidationError('GitHub App is not installed');
    }

    const githubClient = new GitHubClient(
      c.env.GITHUB_APP_ID,
      c.env.GITHUB_APP_PRIVATE_KEY
    );

    const usecase = new ValidateRepositoryUsecase(githubClient, repoRepo);
    const result = await usecase.execute({
      userId: auth.userId,
      installationId: user.githubInstallationId,
      githubRepoFullName,
    });

    return c.json(result);
  }
);

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

// GET /users/me/github-repositories - List repos accessible via installation
app.get('/me/github-repositories', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const userRepo = new UserRepository(c.env.DB);
  const user = await userRepo.findById(auth.userId);
  if (!user) {
    throw new NotFoundError('User', auth.userId);
  }

  if (!user.githubInstallationId) {
    throw new ValidationError('GitHub App is not installed for this user');
  }

  const githubClient = new GitHubClient(
    c.env.GITHUB_APP_ID,
    c.env.GITHUB_APP_PRIVATE_KEY
  );

  const repositories = await githubClient.listInstallationRepositories(
    user.githubInstallationId
  );

  return c.json({ repositories });
});

// PUT /users/me/github-installation - Save GitHub App installation id
app.put(
  '/me/github-installation',
  requireAuth(),
  zValidator(
    'json',
    z.object({
      installationId: z.string().min(1),
    })
  ),
  async (c) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new UnauthorizedError();
    }

    const { installationId } = c.req.valid('json');
    const userRepo = new UserRepository(c.env.DB);

    const user = await userRepo.findById(auth.userId);
    if (!user) {
      throw new NotFoundError('User', auth.userId);
    }

    user.setGitHubInstallation(installationId);
    await userRepo.save(user);

    return c.json(user.toJSON());
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
