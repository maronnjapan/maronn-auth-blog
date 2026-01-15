import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { Env } from '../types/env';
import { Auth0Client } from '../infrastructure/auth0-client';
import { KVClient } from '../infrastructure/storage/kv-client';
import { UserRepository } from '../infrastructure/repositories/user-repository';
import { User, type UserProps } from '../domain/entities/user';
import { encryptSessionId, requireAuth } from '../middleware/auth';
import { UnauthorizedError } from '@maronn-auth-blog/shared';

const app = new Hono<{ Bindings: Env }>();

// GET /auth/login - Redirect to Auth0 authorization
app.get('/login', (c) => {
  const auth0 = new Auth0Client(
    c.env.AUTH0_DOMAIN,
    c.env.AUTH0_CLIENT_ID,
    c.env.AUTH0_CLIENT_SECRET
  );

  const state = crypto.randomUUID();
  const redirectUri = c.env.AUTH0_CALLBACK_URL;

  // TODO: Store state in KV for validation

  const authorizeUrl = auth0.getAuthorizeUrl(redirectUri, state);
  return c.redirect(authorizeUrl);
});

// GET /auth/callback - Auth0 callback
app.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code || !state) {
    throw new UnauthorizedError('Missing code or state');
  }

  // TODO: Validate state

  const auth0 = new Auth0Client(
    c.env.AUTH0_DOMAIN,
    c.env.AUTH0_CLIENT_ID,
    c.env.AUTH0_CLIENT_SECRET
  );

  // Exchange code for tokens
  const tokens = await auth0.exchangeCodeForToken(code, c.env.AUTH0_CALLBACK_URL);

  // Get user info from Auth0
  const userInfo = await auth0.getUserInfo(tokens.access_token);

  // Extract GitHub user ID from sub (format: github|123456)
  const githubUserId = userInfo.sub.replace('github|', '');

  // Find or create user
  const userRepo = new UserRepository(c.env.DB);
  let user = await userRepo.findByGitHubUserId(githubUserId);

  if (!user) {
    // Create new user
    const props: UserProps = {
      id: crypto.randomUUID(),
      username: userInfo.nickname,
      displayName: userInfo.name,
      iconUrl: userInfo.picture,
      githubUserId,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    user = new User(props);
    await userRepo.save(user);
  }

  // Create session
  const sessionId = crypto.randomUUID();
  const kvClient = new KVClient(c.env.KV);

  await kvClient.setSession(sessionId, {
    userId: user.id,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken: tokens.id_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });

  // Set encrypted session cookie
  const encryptedSessionId = await encryptSessionId(sessionId, c.env.SESSION_SECRET);

  setCookie(c, 'session', encryptedSessionId, {
    httpOnly: true,
    secure: c.env.ENVIRONMENT === 'production',
    sameSite: 'Lax',
    maxAge: 90 * 24 * 60 * 60, // 90 days
    path: '/',
  });

  // Redirect to frontend
  return c.redirect(c.env.WEB_URL);
});

// POST /auth/logout - Logout
app.post('/logout', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  // Delete session from KV
  const kvClient = new KVClient(c.env.KV);
  await kvClient.deleteSession(auth.sessionId);

  // Delete cookie
  deleteCookie(c, 'session');

  return c.json({ success: true });
});

// GET /auth/me - Get current user
app.get('/me', requireAuth(), async (c) => {
  const auth = c.get('auth');
  if (!auth) {
    throw new UnauthorizedError();
  }

  const userRepo = new UserRepository(c.env.DB);
  const user = await userRepo.findById(auth.userId);

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  return c.json(user.toJSON());
});

export default app;
