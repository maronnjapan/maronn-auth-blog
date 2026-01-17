import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
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
    c.env.AUTH0_CLIENT_SECRET,
    c.env.AUTH0_CALLBACK_URL
  );

  // Generate state and code verifier for PKCE
  const { state, codeVerifier } = auth0.generateOAuthParams();

  // Cookie options for cross-subdomain sharing
  const cookieOptions = {
    httpOnly: true,
    secure: c.env.ENVIRONMENT === 'production',
    sameSite: 'Lax' as const,
    path: '/',
    // Set domain for cross-subdomain cookie sharing (e.g., '.maronn-room.com')
    ...(c.env.COOKIE_DOMAIN ? { domain: c.env.COOKIE_DOMAIN } : {}),
  };

  // Store in HttpOnly cookies (10 minutes expiry)
  // These are bound to the browser session and prevent CSRF attacks
  setCookie(c, 'oauth_state', state, {
    ...cookieOptions,
    maxAge: 600, // 10 minutes
  });

  setCookie(c, 'oauth_code_verifier', codeVerifier, {
    ...cookieOptions,
    maxAge: 600, // 10 minutes
  });

  const authorizeUrl = auth0.createAuthorizationURL(state, codeVerifier);
  return c.redirect(authorizeUrl.toString());
});

// GET /auth/callback - Auth0 callback
app.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code || !state) {
    throw new UnauthorizedError('Missing code or state');
  }

  // Retrieve state and code verifier from cookies
  const savedState = getCookie(c, 'oauth_state');
  const codeVerifier = getCookie(c, 'oauth_code_verifier');

  if (!savedState || !codeVerifier) {
    throw new UnauthorizedError('Missing OAuth session data');
  }

  // Validate state to prevent CSRF attacks
  if (state !== savedState) {
    throw new UnauthorizedError('State mismatch - possible CSRF attack');
  }

  // Delete OAuth cookies after validation
  const deleteOptions = c.env.COOKIE_DOMAIN ? { domain: c.env.COOKIE_DOMAIN, path: '/' } : { path: '/' };
  deleteCookie(c, 'oauth_state', deleteOptions);
  deleteCookie(c, 'oauth_code_verifier', deleteOptions);

  const auth0 = new Auth0Client(
    c.env.AUTH0_DOMAIN,
    c.env.AUTH0_CLIENT_ID,
    c.env.AUTH0_CLIENT_SECRET,
    c.env.AUTH0_CALLBACK_URL
  );

  // Exchange code for tokens using arctic library with PKCE
  const tokens = await auth0.validateAuthorizationCode(code, codeVerifier);

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
    // Set domain for cross-subdomain cookie sharing
    ...(c.env.COOKIE_DOMAIN ? { domain: c.env.COOKIE_DOMAIN } : {}),
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

  // Delete cookie with domain if set
  const deleteOptions = c.env.COOKIE_DOMAIN ? { domain: c.env.COOKIE_DOMAIN, path: '/' } : { path: '/' };
  deleteCookie(c, 'session', deleteOptions);

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
