import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetFollowStatusUsecase } from './get-follow-status';
import type { FollowRepository } from '../../infrastructure/repositories/follow-repository';

describe('GetFollowStatusUsecase', () => {
  let followRepo: FollowRepository;
  let usecase: GetFollowStatusUsecase;

  beforeEach(() => {
    vi.clearAllMocks();
    followRepo = {
      isFollowing: vi.fn().mockResolvedValue(true),
      countFollowers: vi.fn().mockResolvedValue(10),
      countFollowing: vi.fn().mockResolvedValue(5),
    } as unknown as FollowRepository;
    usecase = new GetFollowStatusUsecase(followRepo);
  });

  it('returns follow status for authenticated user', async () => {
    const result = await usecase.execute('user-1', 'user-2');

    expect(result).toEqual({
      isFollowing: true,
      followerCount: 10,
      followingCount: 5,
    });
    expect(followRepo.isFollowing).toHaveBeenCalledWith('user-1', 'user-2');
    expect(followRepo.countFollowers).toHaveBeenCalledWith('user-2');
    expect(followRepo.countFollowing).toHaveBeenCalledWith('user-2');
  });

  it('returns isFollowing false for unauthenticated user', async () => {
    const result = await usecase.execute(null, 'user-2');

    expect(result).toEqual({
      isFollowing: false,
      followerCount: 10,
      followingCount: 5,
    });
    expect(followRepo.isFollowing).not.toHaveBeenCalled();
  });
});
