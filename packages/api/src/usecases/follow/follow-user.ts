import { FollowRepository } from '../../infrastructure/repositories/follow-repository';
import { UserRepository } from '../../infrastructure/repositories/user-repository';
import { UserNotFoundError, CannotFollowSelfError, AlreadyFollowingError } from '../../domain/errors/domain-errors';
import type { Follow } from '../../domain/entities/follow';

export class FollowUserUsecase {
  constructor(
    private followRepo: FollowRepository,
    private userRepo: UserRepository
  ) {}

  async execute(followerId: string, followingId: string): Promise<Follow> {
    console.info(`[FollowUser] User ${followerId} following ${followingId}`);

    if (followerId === followingId) {
      throw new CannotFollowSelfError();
    }

    const followingUser = await this.userRepo.findById(followingId);
    if (!followingUser) {
      throw new UserNotFoundError(followingId);
    }

    const alreadyFollowing = await this.followRepo.isFollowing(followerId, followingId);
    if (alreadyFollowing) {
      throw new AlreadyFollowingError(followingId);
    }

    const follow = await this.followRepo.follow(followerId, followingId);

    console.info(`[FollowUser] User ${followerId} now follows ${followingId}`);
    return follow;
  }
}
