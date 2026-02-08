import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Auth0UserInfoClient } from './auth0-userinfo-client';

describe('Auth0UserInfoClient', () => {
  let client: Auth0UserInfoClient;
  const domain = 'test-tenant.auth0.com';
  const clientId = 'm2m-client-id';
  const clientSecret = 'm2m-client-secret';

  beforeEach(() => {
    vi.clearAllMocks();
    client = new Auth0UserInfoClient(domain, clientId, clientSecret);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getEmailByAuth0UserId', () => {
    it('returns email when user exists', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      // Mock token response
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'mgmt-token', expires_in: 86400 }),
          { status: 200 }
        )
      );

      // Mock user info response
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ email: 'user@example.com' }), {
          status: 200,
        })
      );

      const email = await client.getEmailByAuth0UserId('github|12345');

      expect(email).toBe('user@example.com');
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // Verify token request
      expect(fetchSpy).toHaveBeenNthCalledWith(
        1,
        `https://${domain}/oauth/token`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            audience: `https://${domain}/api/v2/`,
            grant_type: 'client_credentials',
          }),
        })
      );

      // Verify user info request
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        `https://${domain}/api/v2/users/${encodeURIComponent('github|12345')}`,
        expect.objectContaining({
          headers: { Authorization: 'Bearer mgmt-token' },
        })
      );
    });

    it('returns null when user has no email', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'mgmt-token', expires_in: 86400 }),
          { status: 200 }
        )
      );

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 })
      );

      const email = await client.getEmailByAuth0UserId('github|12345');
      expect(email).toBeNull();
    });

    it('returns null when user info request fails', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'mgmt-token', expires_in: 86400 }),
          { status: 200 }
        )
      );

      fetchSpy.mockResolvedValueOnce(
        new Response('Not Found', { status: 404 })
      );

      const email = await client.getEmailByAuth0UserId('github|99999');
      expect(email).toBeNull();
    });

    it('caches management token and reuses it', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      // First call: token + user info
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'mgmt-token', expires_in: 86400 }),
          { status: 200 }
        )
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ email: 'user1@example.com' }), {
          status: 200,
        })
      );

      await client.getEmailByAuth0UserId('github|11111');

      // Second call: only user info (token is cached)
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ email: 'user2@example.com' }), {
          status: 200,
        })
      );

      const email = await client.getEmailByAuth0UserId('github|22222');

      expect(email).toBe('user2@example.com');
      // Token request should only happen once
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('throws when management token request fails', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      fetchSpy.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );

      await expect(
        client.getEmailByAuth0UserId('github|12345')
      ).rejects.toThrow('Failed to obtain Auth0 management token');
    });
  });
});
