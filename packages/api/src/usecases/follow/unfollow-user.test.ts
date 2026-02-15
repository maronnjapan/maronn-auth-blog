import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnfollowUserUsecase } from './unfollow-user';
import type { FollowRepository } from '../../infrastructure/repositories/follow-repository';
import { FollowNotFoundError } from '../../domain/errors/domain-errors';

describe('UnfollowUserUsecase', () => {
  let followRepo: FollowRepository;
  let usecase: UnfollowUserUsecase;

  beforeEach(() => {
    vi.clearAllMocks();
    followRepo = {
      isFollowing: vi.fn().mockResolvedValue(true),
      unfollow: vi.fn().mockResolvedValue(undefined),
    } as unknown as FollowRepository;
    usecase = new UnfollowUserUsecase(followRepo);
  });

  it('successfully unfollows a user', async () => {
    await usecase.execute('user-1', 'user-2');

    expect(followRepo.isFollowing).toHaveBeenCalledWith('user-1', 'user-2');
    expect(followRepo.unfollow).toHaveBeenCalledWith('user-1', 'user-2');
  });

  it('throws FollowNotFoundError when not following', async () => {
    (followRepo.isFollowing as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await expect(usecase.execute('user-1', 'user-2')).rejects.toThrow(
      FollowNotFoundError
    );
    expect(followRepo.unfollow).not.toHaveBeenCalled();
  });
});
