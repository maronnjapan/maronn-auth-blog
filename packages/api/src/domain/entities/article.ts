import { ArticleStatus } from '../value-objects/article-status';
import { Slug } from '../value-objects/slug';
import { InvalidStatusTransitionError } from '../errors/domain-errors';

export interface ArticleProps {
  id: string;
  userId: string;
  slug: Slug;
  title: string;
  category?: string;
  targetCategory?: string;
  status: ArticleStatus;
  githubPath: string;
  githubSha?: string;
  publishedSha?: string;
  rejectionReason?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Article {
  constructor(private props: ArticleProps) {}

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get slug(): Slug {
    return this.props.slug;
  }

  get title(): string {
    return this.props.title;
  }

  get category(): string | undefined {
    return this.props.category;
  }

  get targetCategory(): string | undefined {
    return this.props.targetCategory;
  }

  get status(): ArticleStatus {
    return this.props.status;
  }

  get githubPath(): string {
    return this.props.githubPath;
  }

  get githubSha(): string | undefined {
    return this.props.githubSha;
  }

  get publishedSha(): string | undefined {
    return this.props.publishedSha;
  }

  get rejectionReason(): string | undefined {
    return this.props.rejectionReason;
  }

  get publishedAt(): Date | undefined {
    return this.props.publishedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  approve(sha: string): void {
    if (!this.props.status.canApprove()) {
      throw new InvalidStatusTransitionError(
        this.props.status.toString(),
        'published'
      );
    }

    this.props = {
      ...this.props,
      status: ArticleStatus.published(),
      publishedSha: sha,
      publishedAt: new Date(),
      rejectionReason: undefined,
      updatedAt: new Date(),
    };
  }

  reject(reason: string): void {
    if (!this.props.status.canReject()) {
      throw new InvalidStatusTransitionError(
        this.props.status.toString(),
        'rejected'
      );
    }

    this.props = {
      ...this.props,
      status: ArticleStatus.rejected(),
      rejectionReason: reason,
      updatedAt: new Date(),
    };
  }

  markForUpdate(newSha: string, metadata?: { title?: string; category?: string; targetCategory?: string }): void {
    if (!this.props.status.canUpdate()) {
      throw new InvalidStatusTransitionError(
        this.props.status.toString(),
        'pending_update'
      );
    }

    this.props = {
      ...this.props,
      title: metadata?.title ?? this.props.title,
      category: metadata?.category !== undefined ? metadata.category : this.props.category,
      targetCategory: metadata?.targetCategory !== undefined ? metadata.targetCategory : this.props.targetCategory,
      status: ArticleStatus.pendingUpdate(),
      githubSha: newSha,
      rejectionReason: undefined,
      updatedAt: new Date(),
    };
  }

  delete(): void {
    if (!this.props.status.canDelete()) {
      throw new InvalidStatusTransitionError(
        this.props.status.toString(),
        'deleted'
      );
    }

    this.props = {
      ...this.props,
      status: ArticleStatus.deleted(),
      updatedAt: new Date(),
    };
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      slug: this.props.slug.toString(),
      title: this.props.title,
      category: this.props.category,
      targetCategory: this.props.targetCategory,
      status: this.props.status.toString(),
      githubPath: this.props.githubPath,
      githubSha: this.props.githubSha,
      publishedSha: this.props.publishedSha,
      rejectionReason: this.props.rejectionReason,
      publishedAt: this.props.publishedAt?.toISOString(),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
