import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefreshSessionUsecase } from './refresh-session';
import type { Auth0Client } from '../../infrastructure/auth0-client';
import type { KVClient, SessionData } from '../../infrastructure/storage/kv-client';

describe('RefreshSessionUsecase', () => {
  let auth0Client: Auth0Client;
  let kvClient: KVClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createUsecase(options: {
    refreshResult?: {
      access_token: string;
      refresh_token?: string;
      id_token: string;
      token_type: string;
      expires_in: number;
    };
    refreshError?: Error;
  } = {}) {
    const defaultRefreshResult = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      id_token: 'new-id-token',
      token_type: 'Bearer',
      expires_in: 3600,
    };

    auth0Client = {
      refreshAccessToken: options.refreshError
        ? vi.fn().mockRejectedValue(options.refreshError)
        : vi.fn().mockResolvedValue(options.refreshResult ?? defaultRefreshResult),
    } as unknown as Auth0Client;

    kvClient = {
      setSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as KVClient;

    return new RefreshSessionUsecase(auth0Client, kvClient);
  }

  function createSessionData(
    overrides: Partial<SessionData> = {}
  ): SessionData {
    return {
      userId: 'user-1',
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
      idToken: 'old-id-token',
      expiresAt: Date.now() - 1000,
      permissions: ['read:articles'],
      ...overrides,
    };
  }

  it('refreshes tokens and creates a new session', async () => {
    const usecase = createUsecase();
    const session = createSessionData();

    const result = await usecase.execute(session);

    expect(auth0Client.refreshAccessToken).toHaveBeenCalledWith(
      'old-refresh-token'
    );
    expect(result.newSessionId).toBeDefined();
    expect(result.newSessionId).not.toBe('old-session-id');
    expect(result.newSessionData.userId).toBe('user-1');
    expect(result.newSessionData.accessToken).toBe('new-access-token');
    expect(result.newSessionData.refreshToken).toBe('new-refresh-token');
    expect(result.newSessionData.idToken).toBe('new-id-token');
    expect(result.newSessionData.expiresAt).toBeGreaterThan(Date.now());

    expect(kvClient.setSession).toHaveBeenCalledWith(
      result.newSessionId,
      result.newSessionData
    );
  });

  it('throws UnauthorizedError when no refresh token is available', async () => {
    const usecase = createUsecase();
    const session = createSessionData({ refreshToken: undefined });

    await expect(
      usecase.execute(session)
    ).rejects.toThrow('No refresh token available');

    expect(auth0Client.refreshAccessToken).not.toHaveBeenCalled();
    expect(kvClient.setSession).not.toHaveBeenCalled();
  });

  it('propagates Auth0 refresh errors', async () => {
    const usecase = createUsecase({
      refreshError: new Error('invalid_grant'),
    });
    const session = createSessionData();

    await expect(
      usecase.execute(session)
    ).rejects.toThrow('invalid_grant');
  });

  it('preserves the original userId in the new session', async () => {
    const usecase = createUsecase();
    const session = createSessionData({ userId: 'specific-user-id' });

    const result = await usecase.execute(session);

    expect(result.newSessionData.userId).toBe('specific-user-id');
  });

  it('calculates expiresAt from expires_in', async () => {
    const now = Date.now();
    const usecase = createUsecase({
      refreshResult: {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        id_token: 'new-id-token',
        token_type: 'Bearer',
        expires_in: 7200, // 2 hours
      },
    });
    const session = createSessionData();

    const result = await usecase.execute(session);

    // Should be approximately 2 hours from now
    expect(result.newSessionData.expiresAt).toBeGreaterThanOrEqual(
      now + 7200 * 1000 - 1000
    );
    expect(result.newSessionData.expiresAt).toBeLessThanOrEqual(
      now + 7200 * 1000 + 1000
    );
  });
});
