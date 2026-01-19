import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GitHubClient } from './github-client';

const mocks = vi.hoisted(() => {
  const authFn = vi.fn();
  const createAppAuthMock = vi.fn(() => authFn);
  const listReposMock = vi.fn();
  const OctokitMock = vi.fn(() => ({
    apps: {
      listReposAccessibleToInstallation: listReposMock,
    },
  }));

  return { authFn, createAppAuthMock, listReposMock, OctokitMock };
});

vi.mock('@octokit/auth-app', () => ({
  createAppAuth: mocks.createAppAuthMock,
}));

vi.mock('@octokit/rest', () => ({
  Octokit: mocks.OctokitMock,
}));

describe('GitHubClient', () => {
  beforeEach(() => {
    mocks.authFn.mockReset();
    mocks.listReposMock.mockReset();
    mocks.createAppAuthMock.mockClear();
    mocks.OctokitMock.mockClear();
    mocks.authFn.mockResolvedValue({ token: 'test-token' });
    mocks.listReposMock.mockResolvedValue({
      data: {
        repositories: [
          {
            id: 123,
            name: 'content-repo',
            full_name: 'tester/content-repo',
            owner: { login: 'tester' },
            description: 'Test repository',
            private: false,
            default_branch: 'main',
            html_url: 'https://github.com/tester/content-repo',
            pushed_at: '2024-01-01T00:00:00Z',
          },
        ],
      },
    });
  });

  it('lists repositories accessible to a GitHub installation', async () => {
    const client = new GitHubClient('app-id', 'private-key');

    const repositories = await client.listInstallationRepositories('999999');

    expect(mocks.createAppAuthMock).toHaveBeenCalledWith({
      appId: 'app-id',
      privateKey: 'private-key', // すでに PKCS#8 でない場合は変換されるが、テストでは文字列として渡される
    });
    expect(mocks.authFn).toHaveBeenCalledWith({
      type: 'installation',
      installationId: 999999,
    });
    expect(mocks.OctokitMock).toHaveBeenCalledWith({ auth: 'test-token' });
    expect(mocks.listReposMock).toHaveBeenCalledWith({ per_page: 100 });
    expect(repositories).toEqual([
      {
        id: 123,
        name: 'content-repo',
        fullName: 'tester/content-repo',
        owner: 'tester',
        description: 'Test repository',
        isPrivate: false,
        defaultBranch: 'main',
        htmlUrl: 'https://github.com/tester/content-repo',
        pushedAt: '2024-01-01T00:00:00Z',
      },
    ]);
  });

  describe('verifyWebhookSignature', () => {
    const secret = 'test-webhook-secret';

    async function generateSignature(payload: string, secret: string): Promise<string> {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(payload)
      );

      return `sha256=${Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')}`;
    }

    it('returns true for valid signature', async () => {
      const client = new GitHubClient('app-id', 'private-key');
      const payload = '{"action":"push","ref":"refs/heads/main"}';
      const validSignature = await generateSignature(payload, secret);

      const result = await client.verifyWebhookSignature(payload, validSignature, secret);

      expect(result).toBe(true);
    });

    it('returns false for invalid signature', async () => {
      const client = new GitHubClient('app-id', 'private-key');
      const payload = '{"action":"push","ref":"refs/heads/main"}';
      const invalidSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

      const result = await client.verifyWebhookSignature(payload, invalidSignature, secret);

      expect(result).toBe(false);
    });

    it('returns false for signature with wrong secret', async () => {
      const client = new GitHubClient('app-id', 'private-key');
      const payload = '{"action":"push","ref":"refs/heads/main"}';
      const signatureWithWrongSecret = await generateSignature(payload, 'wrong-secret');

      const result = await client.verifyWebhookSignature(payload, signatureWithWrongSecret, secret);

      expect(result).toBe(false);
    });

    it('returns false for tampered payload', async () => {
      const client = new GitHubClient('app-id', 'private-key');
      const originalPayload = '{"action":"push","ref":"refs/heads/main"}';
      const tamperedPayload = '{"action":"push","ref":"refs/heads/develop"}';
      const signature = await generateSignature(originalPayload, secret);

      const result = await client.verifyWebhookSignature(tamperedPayload, signature, secret);

      expect(result).toBe(false);
    });

    it('returns false for signatures with different lengths', async () => {
      const client = new GitHubClient('app-id', 'private-key');
      const payload = '{"action":"push"}';
      const shortSignature = 'sha256=0000';

      const result = await client.verifyWebhookSignature(payload, shortSignature, secret);

      expect(result).toBe(false);
    });
  });
});
