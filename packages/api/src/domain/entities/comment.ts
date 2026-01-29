export interface CommentProps {
  id: string;
  articleId: string;
  userId: string;
  bodyMarkdown: string;
  bodyHtml: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Comment {
  constructor(private props: CommentProps) {}

  get id(): string {
    return this.props.id;
  }

  get articleId(): string {
    return this.props.articleId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get bodyMarkdown(): string {
    return this.props.bodyMarkdown;
  }

  get bodyHtml(): string {
    return this.props.bodyHtml;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  toJSON() {
    return {
      id: this.props.id,
      articleId: this.props.articleId,
      userId: this.props.userId,
      bodyMarkdown: this.props.bodyMarkdown,
      bodyHtml: this.props.bodyHtml,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
