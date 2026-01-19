import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { SignJWT, jwtVerify } from 'jose';
import type { Env } from '../types/env';
import { KVClient } from '../infrastructure/storage/kv-client';
import { UnauthorizedError, ForbiddenError } from '@maronn-auth-blog/shared';

export interface AuthContext {
  userId: string;
  sessionId: string;
  permissions: string[];
}

declare module 'hono' {
  interface ContextVariableMap {
    auth?: AuthContext;
  }
}

export async function encryptSessionId(sessionId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  // Ensure secret is at least 32 bytes for HS256
  const secretKey = encoder.encode(secret.padEnd(32, '0').slice(0, 32));

  const jwt = await new SignJWT({ sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('90d')
    .sign(secretKey);

  return jwt;
}

export async function decryptSessionId(token: string, secret: string): Promise<string | null> {
  try {
    const encoder = new TextEncoder();
    // Use the same secret key derivation as encryption
    const secretKey = encoder.encode(secret.padEnd(32, '0').slice(0, 32));

    const { payload } = await jwtVerify(token, secretKey);

    return payload.sessionId as string;
  } catch {
    return null;
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const token = getCookie(c, 'session');

  if (!token) {
    throw new UnauthorizedError('No session token');
  }

  const sessionId = await decryptSessionId(token, c.env.SESSION_SECRET);

  if (!sessionId) {
    throw new UnauthorizedError('Invalid session token');
  }

  const kvClient = new KVClient(c.env.KV);
  const session = await kvClient.getSession(sessionId);

  if (!session) {
    throw new UnauthorizedError('Session not found');
  }

  // Check if access token is expired
  if (session.expiresAt < Date.now()) {
    // TODO: Implement token refresh
    throw new UnauthorizedError('Session expired');
  }

  // Set auth context
  c.set('auth', {
    userId: session.userId,
    sessionId,
    permissions: session.permissions ?? [],
  });

  await next();
}

export function requireAuth() {
  return authMiddleware;
}

export function requireAdmin() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    await authMiddleware(c, async () => {});

    const auth = c.get('auth');
    if (!auth) {
      throw new UnauthorizedError();
    }

    const hasAdminPermission = auth.permissions?.includes('admin:users');
    if (!hasAdminPermission) {
      throw new ForbiddenError('Admin access required');
    }

    await next();
  };
}
