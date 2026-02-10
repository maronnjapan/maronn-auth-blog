import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CleanupStaleSessionsUsecase } from './cleanup-stale-sessions';
import type { KVClient, SessionKeyEntry, SessionData } from '../../infrastructure/storage/kv-client';

describe('CleanupStaleSessionsUsecase', () => {
  let kvClient: KVClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createUsecase(options: {
    sessionKeys?: SessionKeyEntry[];
    getSessionImpl?: (sessionId: string) => Promise<SessionData | null>;
  } = {}) {
    kvClient = {
      listSessionKeys: vi.fn().mockResolvedValue(options.sessionKeys ?? []),
      getSession: options.getSessionImpl
        ? vi.fn().mockImplementation(options.getSessionImpl)
        : vi.fn().mockResolvedValue(null),
      deleteSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as KVClient;

    return new CleanupStaleSessionsUsecase(kvClient);
  }

  it('does nothing when no sessions exist', async () => {
    const usecase = createUsecase();

    const result = await usecase.execute();

    expect(result.totalSessions).toBe(0);
    expect(result.deletedSessions).toBe(0);
    expect(kvClient.deleteSession).not.toHaveBeenCalled();
  });

  it('keeps single sessions per user', async () => {
    const usecase = createUsecase({
      sessionKeys: [
        {
          sessionId: 'session-1',
          metadata: { userId: 'user-1', expiresAt: Date.now() + 3600000 },
        },
        {
          sessionId: 'session-2',
          metadata: { userId: 'user-2', expiresAt: Date.now() + 3600000 },
        },
      ],
    });

    const result = await usecase.execute();

    expect(result.totalSessions).toBe(2);
    expect(result.deletedSessions).toBe(0);
    expect(kvClient.deleteSession).not.toHaveBeenCalled();
  });

  it('deletes older sessions when user has multiple, keeping the latest', async () => {
    const usecase = createUsecase({
      sessionKeys: [
        {
          sessionId: 'old-session',
          metadata: { userId: 'user-1', expiresAt: 1000 },
        },
        {
          sessionId: 'new-session',
          metadata: { userId: 'user-1', expiresAt: 5000 },
        },
        {
          sessionId: 'mid-session',
          metadata: { userId: 'user-1', expiresAt: 3000 },
        },
      ],
    });

    const result = await usecase.execute();

    expect(result.totalSessions).toBe(3);
    expect(result.deletedSessions).toBe(2);
    expect(kvClient.deleteSession).toHaveBeenCalledWith('mid-session');
    expect(kvClient.deleteSession).toHaveBeenCalledWith('old-session');
    expect(kvClient.deleteSession).not.toHaveBeenCalledWith('new-session');
  });

  it('handles multiple users with mixed session counts', async () => {
    const usecase = createUsecase({
      sessionKeys: [
        {
          sessionId: 'u1-old',
          metadata: { userId: 'user-1', expiresAt: 1000 },
        },
        {
          sessionId: 'u1-new',
          metadata: { userId: 'user-1', expiresAt: 5000 },
        },
        {
          sessionId: 'u2-only',
          metadata: { userId: 'user-2', expiresAt: 3000 },
        },
        {
          sessionId: 'u3-old',
          metadata: { userId: 'user-3', expiresAt: 1000 },
        },
        {
          sessionId: 'u3-new',
          metadata: { userId: 'user-3', expiresAt: 9000 },
        },
      ],
    });

    const result = await usecase.execute();

    expect(result.totalSessions).toBe(5);
    expect(result.deletedSessions).toBe(2);
    expect(kvClient.deleteSession).toHaveBeenCalledWith('u1-old');
    expect(kvClient.deleteSession).toHaveBeenCalledWith('u3-old');
    expect(kvClient.deleteSession).not.toHaveBeenCalledWith('u1-new');
    expect(kvClient.deleteSession).not.toHaveBeenCalledWith('u2-only');
    expect(kvClient.deleteSession).not.toHaveBeenCalledWith('u3-new');
  });

  it('falls back to reading session data when metadata is missing', async () => {
    const usecase = createUsecase({
      sessionKeys: [
        { sessionId: 'legacy-old', metadata: undefined },
        { sessionId: 'legacy-new', metadata: undefined },
      ],
      getSessionImpl: (sessionId: string) => {
        if (sessionId === 'legacy-old') {
          return Promise.resolve({
            userId: 'user-1',
            accessToken: 'at',
            idToken: 'it',
            expiresAt: 1000,
          });
        }
        if (sessionId === 'legacy-new') {
          return Promise.resolve({
            userId: 'user-1',
            accessToken: 'at',
            idToken: 'it',
            expiresAt: 5000,
          });
        }
        return Promise.resolve(null);
      },
    });

    const result = await usecase.execute();

    expect(result.deletedSessions).toBe(1);
    expect(kvClient.deleteSession).toHaveBeenCalledWith('legacy-old');
    expect(kvClient.deleteSession).not.toHaveBeenCalledWith('legacy-new');
    expect(kvClient.getSession).toHaveBeenCalledTimes(2);
  });

  it('skips sessions that cannot be read (no metadata and KV read returns null)', async () => {
    const usecase = createUsecase({
      sessionKeys: [
        { sessionId: 'gone-session', metadata: undefined },
        {
          sessionId: 'valid-session',
          metadata: { userId: 'user-1', expiresAt: 5000 },
        },
      ],
      getSessionImpl: () => Promise.resolve(null),
    });

    const result = await usecase.execute();

    expect(result.totalSessions).toBe(2);
    expect(result.deletedSessions).toBe(0);
    expect(kvClient.deleteSession).not.toHaveBeenCalled();
  });
});
