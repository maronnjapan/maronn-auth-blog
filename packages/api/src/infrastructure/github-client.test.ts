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
      privateKey: 'private-key',
    });
    expect(mocks.authFn).toHaveBeenCalledWith({
      type: 'installation',
      installationId: '999999',
    });
    expect(mocks.OctokitMock).toHaveBeenCalledWith({ auth: 'test-token' });
    expect(mocks.listReposMock).toHaveBeenCalledWith({ per_page: 100 });
    expect(repositories).toEqual([
      {
        id: 123,
        name: 'content-repo',
        fullName: 'tester/content-repo',
        owner: 'tester',
      },
    ]);
  });
});
