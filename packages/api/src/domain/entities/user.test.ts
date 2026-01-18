import { describe, expect, it } from 'vitest';
import { User, type UserProps } from './user';

const baseUserProps: UserProps = {
  id: 'user-1',
  username: 'tester',
  displayName: 'Tester',
  githubUserId: 'github-123',
  role: 'user',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('User entity', () => {
  it('updates GitHub installation id', () => {
    const user = new User(baseUserProps);
    const before = user.updatedAt.getTime();

    user.setGitHubInstallation('999999');

    expect(user.githubInstallationId).toBe('999999');
    expect(user.updatedAt.getTime()).toBeGreaterThan(before);
    expect(user.toJSON().githubInstallationId).toBe('999999');
  });
});
