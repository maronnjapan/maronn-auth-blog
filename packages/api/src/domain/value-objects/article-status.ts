import { articleStatusSchema, type ArticleStatus as ArticleStatusType } from '@maronn-auth-blog/shared';

export class ArticleStatus {
  private constructor(private readonly value: ArticleStatusType) {}

  static pendingNew(): ArticleStatus {
    return new ArticleStatus('pending_new');
  }

  static pendingUpdate(): ArticleStatus {
    return new ArticleStatus('pending_update');
  }

  static published(): ArticleStatus {
    return new ArticleStatus('published');
  }

  static rejected(_reason?: string): ArticleStatus {
    return new ArticleStatus('rejected');
  }

  static deleted(): ArticleStatus {
    return new ArticleStatus('deleted');
  }

  static fromString(value: string): ArticleStatus {
    const parsed = articleStatusSchema.parse(value);
    return new ArticleStatus(parsed);
  }

  canApprove(): boolean {
    return this.value === 'pending_new' || this.value === 'pending_update';
  }

  canReject(): boolean {
    return this.value === 'pending_new' || this.value === 'pending_update';
  }

  canDelete(): boolean {
    return this.value !== 'deleted';
  }

  canUpdate(): boolean {
    return this.value === 'published' || this.value === 'rejected';
  }

  toString(): ArticleStatusType {
    return this.value;
  }

  equals(other: ArticleStatus): boolean {
    return this.value === other.value;
  }
}
