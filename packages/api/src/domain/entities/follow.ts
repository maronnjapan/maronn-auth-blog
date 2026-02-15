export interface FollowProps {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export class Follow {
  constructor(private props: FollowProps) {}

  get id(): string {
    return this.props.id;
  }

  get followerId(): string {
    return this.props.followerId;
  }

  get followingId(): string {
    return this.props.followingId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toJSON() {
    return {
      id: this.props.id,
      followerId: this.props.followerId,
      followingId: this.props.followingId,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
