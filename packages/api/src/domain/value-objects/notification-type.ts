import { notificationTypeSchema, type NotificationType as NotificationTypeValue } from '@maronn-auth-blog/shared';

export class NotificationType {
  private constructor(private readonly value: NotificationTypeValue) {}

  static articleApproved(): NotificationType {
    return new NotificationType('article_approved');
  }

  static articleRejected(): NotificationType {
    return new NotificationType('article_rejected');
  }

  static articleUpdateDetected(): NotificationType {
    return new NotificationType('article_update_detected');
  }

  static newArticleFromFollowed(): NotificationType {
    return new NotificationType('new_article_from_followed');
  }

  static fromString(value: string): NotificationType {
    const parsed = notificationTypeSchema.parse(value);
    return new NotificationType(parsed);
  }

  toString(): NotificationTypeValue {
    return this.value;
  }

  equals(other: NotificationType): boolean {
    return this.value === other.value;
  }
}
