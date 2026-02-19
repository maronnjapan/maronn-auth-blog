import { FollowRepository } from '../../infrastructure/repositories/follow-repository';
import { FollowNotFoundError } from '../../domain/errors/domain-errors';

export class UnfollowUserUsecase {
  constructor(private followRepo: FollowRepository) {}

  async execute(followerId: string, followingId: string): Promise<void> {
    console.info(`[UnfollowUser] User ${followerId} unfollowing ${followingId}`);

    const isFollowing = await this.followRepo.isFollowing(followerId, followingId);
    if (!isFollowing) {
      throw new FollowNotFoundError(followingId);
    }

    await this.followRepo.unfollow(followerId, followingId);

    console.info(`[UnfollowUser] User ${followerId} unfollowed ${followingId}`);
  }
}
