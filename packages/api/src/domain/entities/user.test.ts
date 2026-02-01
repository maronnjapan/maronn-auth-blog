import { describe, expect, it } from 'vitest';
import { User, type UserProps } from './user';

const baseUserProps: UserProps = {
  id: 'user-1',
  username: 'tester',
  displayName: 'Tester',
  githubUserId: 'github-123',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('User entity', () => {
  it('updates profile fields', () => {
    const user = new User(baseUserProps);
    const before = user.updatedAt.getTime();

    user.updateProfile({
      username: 'tester-updated',
      displayName: 'Updated Name',
      bio: 'Hello',
      githubUrl: 'https://github.com/tester',
    });

    expect(user.username).toBe('tester-updated');
    expect(user.displayName).toBe('Updated Name');
    expect(user.bio).toBe('Hello');
    expect(user.githubUrl).toBe('https://github.com/tester');
    expect(user.updatedAt.getTime()).toBeGreaterThan(before);
  });

  it('updates GitHub installation id', () => {
    const user = new User(baseUserProps);
    const before = user.updatedAt.getTime();

    user.setGitHubInstallation('999999');

    expect(user.githubInstallationId).toBe('999999');
    expect(user.updatedAt.getTime()).toBeGreaterThan(before);
    expect(user.toJSON().githubInstallationId).toBe('999999');
  });

  it('clears optional urls when set to blank', () => {
    const user = new User({
      ...baseUserProps,
      githubUrl: 'https://github.com/tester',
      twitterUrl: 'https://twitter.com/tester',
      websiteUrl: 'https://example.com',
    });

    user.updateProfile({
      githubUrl: '   ',
      twitterUrl: '',
      websiteUrl: '   ',
    });

    expect(user.githubUrl).toBeUndefined();
    expect(user.twitterUrl).toBeUndefined();
    expect(user.websiteUrl).toBeUndefined();
  });
});
