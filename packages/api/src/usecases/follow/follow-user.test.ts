import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FollowUserUsecase } from './follow-user';
import type { FollowRepository } from '../../infrastructure/repositories/follow-repository';
import type { UserRepository } from '../../infrastructure/repositories/user-repository';
import { User } from '../../domain/entities/user';
import { Follow } from '../../domain/entities/follow';
import { CannotFollowSelfError, AlreadyFollowingError, UserNotFoundError } from '../../domain/errors/domain-errors';

describe('FollowUserUsecase', () => {
  let followRepo: FollowRepository;
  let userRepo: UserRepository;
  let usecase: FollowUserUsecase;

  const mockUser = new User({
    id: 'user-2',
    username: 'target-user',
    displayName: 'Target User',
    githubUserId: 'gh-2',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockFollow = new Follow({
    id: 'follow-1',
    followerId: 'user-1',
    followingId: 'user-2',
    createdAt: new Date(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    followRepo = {
      follow: vi.fn().mockResolvedValue(mockFollow),
      isFollowing: vi.fn().mockResolvedValue(false),
    } as unknown as FollowRepository;
    userRepo = {
      findById: vi.fn().mockResolvedValue(mockUser),
    } as unknown as UserRepository;
    usecase = new FollowUserUsecase(followRepo, userRepo);
  });

  it('successfully follows a user', async () => {
    const result = await usecase.execute('user-1', 'user-2');

    expect(result).toBe(mockFollow);
    expect(userRepo.findById).toHaveBeenCalledWith('user-2');
    expect(followRepo.isFollowing).toHaveBeenCalledWith('user-1', 'user-2');
    expect(followRepo.follow).toHaveBeenCalledWith('user-1', 'user-2');
  });

  it('throws CannotFollowSelfError when following self', async () => {
    await expect(usecase.execute('user-1', 'user-1')).rejects.toThrow(
      CannotFollowSelfError
    );
    expect(followRepo.follow).not.toHaveBeenCalled();
  });

  it('throws UserNotFoundError when target user does not exist', async () => {
    (userRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(usecase.execute('user-1', 'user-2')).rejects.toThrow(
      UserNotFoundError
    );
    expect(followRepo.follow).not.toHaveBeenCalled();
  });

  it('throws AlreadyFollowingError when already following', async () => {
    (followRepo.isFollowing as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await expect(usecase.execute('user-1', 'user-2')).rejects.toThrow(
      AlreadyFollowingError
    );
    expect(followRepo.follow).not.toHaveBeenCalled();
  });
});
