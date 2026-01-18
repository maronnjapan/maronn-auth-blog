import { NotificationRepository } from '../../infrastructure/repositories/notification-repository';
import { Notification, type NotificationProps } from '../../domain/entities/notification';
import { NotificationType } from '../../domain/value-objects/notification-type';
import type { NotificationType as NotificationTypeValue } from '@maronn-auth-blog/shared';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationTypeValue;
  articleId?: string;
  message: string;
}

export class CreateNotificationUsecase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(input: CreateNotificationInput): Promise<Notification> {
    console.info(`[CreateNotification] Creating notification for user: ${input.userId}`);

    const props: NotificationProps = {
      id: crypto.randomUUID(),
      userId: input.userId,
      type: NotificationType.fromString(input.type),
      articleId: input.articleId,
      message: input.message,
      readAt: undefined,
      createdAt: new Date(),
    };

    const notification = new Notification(props);
    await this.notificationRepo.save(notification);

    console.info(`[CreateNotification] Notification created: ${notification.id}`);
    return notification;
  }
}
