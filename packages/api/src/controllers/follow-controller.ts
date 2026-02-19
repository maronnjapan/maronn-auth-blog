import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env } from '../types/env';
import { FollowRepository } from '../infrastructure/repositories/follow-repository';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { requireAuth } from '../middleware/auth';
import { decryptSessionId } from '../middleware/auth';
import { KVClient } from '../infrastructure/storage/kv-client';
import { UnauthorizedError } from '@maronn-auth-blog/shared';
import { FollowUserUsecase } from '../usecases/follow/follow-user';
import { UnfollowUserUsecase } from '../usecases/follow/unfollow-user';
import { GetFollowStatusUsecase } from '../usecases/follow/get-follow-status';
import { GetFollowersUsecase } from '../usecases/follow/get-followers';
import { GetFollowingUsecase } from '../usecases/follow/get-following';

const app = new Hono<{ Bindings: Env }>();

// POST /follows/:userId - Follow a user
app.post('/:userId', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const followingId = c.req.param('userId');
  const followRepo = new FollowRepository(c.env.DB);
  const userRepo = new UserRepository(c.env.DB);

  const usecase = new FollowUserUsecase(followRepo, userRepo);
  const follow = await usecase.execute(auth.userId, followingId);

  return c.json({ success: true, follow: follow.toJSON() }, 201);
});

// DELETE /follows/:userId - Unfollow a user
app.delete('/:userId', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const followingId = c.req.param('userId');
  const followRepo = new FollowRepository(c.env.DB);

  const usecase = new UnfollowUserUsecase(followRepo);
  await usecase.execute(auth.userId, followingId);

  return c.json({ success: true });
});

// GET /follows/:userId/status - Get follow status for a user
app.get('/:userId/status', async (c) => {
  const targetUserId = c.req.param('userId');

  // Try to get current user (optional auth)
  let currentUserId: string | null = null;
  try {
    const token = getCookie(c, 'session');
    if (token) {
      const sessionId = await decryptSessionId(token, c.env.SESSION_SECRET);
      if (sessionId) {
        const kvClient = new KVClient(c.env.KV);
        const session = await kvClient.getSession(sessionId);
        if (session) {
          currentUserId = session.userId;
        }
      }
    }
  } catch {
    // Ignore auth errors for optional auth
  }

  const followRepo = new FollowRepository(c.env.DB);
  const usecase = new GetFollowStatusUsecase(followRepo);
  const status = await usecase.execute(currentUserId, targetUserId);

  return c.json(status);
});

// GET /follows/:userId/followers - Get followers list
app.get('/:userId/followers', async (c) => {
  const userId = c.req.param('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  const followRepo = new FollowRepository(c.env.DB);
  const userRepo = new UserRepository(c.env.DB);

  const usecase = new GetFollowersUsecase(followRepo, userRepo);
  const result = await usecase.execute(userId, page, limit);

  return c.json({
    users: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    hasMore: result.hasMore,
  });
});

// GET /follows/:userId/following - Get following list
app.get('/:userId/following', async (c) => {
  const userId = c.req.param('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  const followRepo = new FollowRepository(c.env.DB);
  const userRepo = new UserRepository(c.env.DB);

  const usecase = new GetFollowingUsecase(followRepo, userRepo);
  const result = await usecase.execute(userId, page, limit);

  return c.json({
    users: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    hasMore: result.hasMore,
  });
});

export default app;
