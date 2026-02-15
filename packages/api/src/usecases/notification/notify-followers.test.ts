import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotifyFollowersUsecase } from './notify-followers';
import type { FollowRepository } from '../../infrastructure/repositories/follow-repository';
import type { NotificationRepository } from '../../infrastructure/repositories/notification-repository';
import type { NotificationSettingsRepository } from '../../infrastructure/repositories/notification-settings-repository';
import type { UserRepository } from '../../infrastructure/repositories/user-repository';
import type { Auth0UserInfoClient } from '../../infrastructure/auth0-userinfo-client';
import type { ResendClient } from '../../infrastructure/resend-client';
import { NotificationSettings } from '../../domain/entities/notification-settings';
import { User } from '../../domain/entities/user';

describe('NotifyFollowersUsecase', () => {
  let followRepo: FollowRepository;
  let notificationRepo: NotificationRepository;
  let notificationSettingsRepo: NotificationSettingsRepository;
  let userRepo: UserRepository;
  let auth0UserInfoClient: Auth0UserInfoClient;
  let resendClient: ResendClient;
  let usecase: NotifyFollowersUsecase;

  const input = {
    authorId: 'author-1',
    articleId: 'article-1',
    articleTitle: 'テスト記事',
    articleSlug: 'test-article',
    authorUsername: 'author',
    authorDisplayName: 'Author Name',
    webUrl: 'https://example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    followRepo = {
      getFollowerIds: vi.fn().mockResolvedValue(['follower-1', 'follower-2']),
    } as unknown as FollowRepository;

    notificationRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationRepository;

    notificationSettingsRepo = {
      findByUserId: vi.fn().mockResolvedValue(null),
    } as unknown as NotificationSettingsRepository;

    userRepo = {
      findById: vi.fn().mockResolvedValue(
        new User({
          id: 'follower-1',
          username: 'follower',
          displayName: 'Follower',
          githubUserId: 'gh-follower',
          auth0UserId: 'auth0|follower',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
    } as unknown as UserRepository;

    auth0UserInfoClient = {
      getEmailByAuth0UserId: vi.fn().mockResolvedValue('follower@example.com'),
    } as unknown as Auth0UserInfoClient;

    resendClient = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as ResendClient;

    usecase = new NotifyFollowersUsecase(
      followRepo,
      notificationRepo,
      notificationSettingsRepo,
      userRepo,
      auth0UserInfoClient,
      resendClient
    );
  });

  it('creates in-app notifications for all followers', async () => {
    await usecase.execute(input);

    expect(followRepo.getFollowerIds).toHaveBeenCalledWith('author-1');
    // 2 followers = 2 save calls
    expect(notificationRepo.save).toHaveBeenCalledTimes(2);
  });

  it('does nothing when there are no followers', async () => {
    (followRepo.getFollowerIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await usecase.execute(input);

    expect(notificationRepo.save).not.toHaveBeenCalled();
  });

  it('does not send email when email notifications are disabled', async () => {
    await usecase.execute(input);

    // Email notifications are disabled by default (findByUserId returns null)
    expect(resendClient.sendEmail).not.toHaveBeenCalled();
  });

  it('sends email when email notifications are enabled', async () => {
    const settings = new NotificationSettings({
      id: 'settings-1',
      userId: 'follower-1',
      emailNotifications: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (notificationSettingsRepo.findByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(settings);

    await usecase.execute(input);

    expect(resendClient.sendEmail).toHaveBeenCalled();
  });

  it('continues processing even if one follower notification fails', async () => {
    let callCount = 0;
    (notificationRepo.save as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Save failed');
      }
      return Promise.resolve(undefined);
    });

    await expect(usecase.execute(input)).resolves.not.toThrow();

    // Second follower should still be processed
    expect(notificationRepo.save).toHaveBeenCalledTimes(2);
  });
});
