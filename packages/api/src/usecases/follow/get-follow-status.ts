import { FollowRepository } from '../../infrastructure/repositories/follow-repository';

export interface FollowStatus {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

export class GetFollowStatusUsecase {
  constructor(private followRepo: FollowRepository) {}

  async execute(currentUserId: string | null, targetUserId: string): Promise<FollowStatus> {
    const [isFollowing, followerCount, followingCount] = await Promise.all([
      currentUserId
        ? this.followRepo.isFollowing(currentUserId, targetUserId)
        : Promise.resolve(false),
      this.followRepo.countFollowers(targetUserId),
      this.followRepo.countFollowing(targetUserId),
    ]);

    return {
      isFollowing,
      followerCount,
      followingCount,
    };
  }
}
