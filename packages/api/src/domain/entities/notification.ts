import { NotificationType } from '../value-objects/notification-type';

export interface NotificationProps {
  id: string;
  userId: string;
  type: NotificationType;
  articleId?: string;
  message: string;
  readAt?: Date;
  createdAt: Date;
}

export class Notification {
  constructor(private props: NotificationProps) {}

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get articleId(): string | undefined {
    return this.props.articleId;
  }

  get message(): string {
    return this.props.message;
  }

  get readAt(): Date | undefined {
    return this.props.readAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isRead(): boolean {
    return this.props.readAt !== undefined;
  }

  markAsRead(): void {
    if (this.props.readAt === undefined) {
      this.props = {
        ...this.props,
        readAt: new Date(),
      };
    }
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      type: this.props.type.toString(),
      articleId: this.props.articleId,
      message: this.props.message,
      readAt: this.props.readAt?.toISOString(),
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
