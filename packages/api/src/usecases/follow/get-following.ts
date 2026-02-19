import { FollowRepository } from '../../infrastructure/repositories/follow-repository';
import { UserRepository } from '../../infrastructure/repositories/user-repository';
import type { PaginatedResponse } from '@maronn-auth-blog/shared';

export interface FollowingInfo {
  id: string;
  username: string;
  displayName: string;
  iconUrl?: string;
  followedAt: string;
}

export class GetFollowingUsecase {
  constructor(
    private followRepo: FollowRepository,
    private userRepo: UserRepository
  ) {}

  async execute(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<FollowingInfo>> {
    const offset = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      this.followRepo.getFollowing(userId, limit, offset),
      this.followRepo.countFollowing(userId),
    ]);

    const items = await Promise.all(
      follows.map(async (follow) => {
        const user = await this.userRepo.findById(follow.followingId);
        if (!user) return null;

        const json = user.toJSON();
        return {
          id: json.id,
          username: json.username,
          displayName: json.displayName,
          iconUrl: json.iconUrl,
          followedAt: follow.createdAt.toISOString(),
        };
      })
    );

    const filteredItems = items.filter((item) => item !== null) as FollowingInfo[];

    return {
      items: filteredItems,
      total,
      page,
      limit,
      hasMore: offset + follows.length < total,
    };
  }
}
