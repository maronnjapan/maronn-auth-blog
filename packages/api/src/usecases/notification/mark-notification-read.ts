import { NotificationRepository } from '../../infrastructure/repositories/notification-repository';
import { NotificationNotFoundError } from '../../domain/errors/domain-errors';

export class MarkNotificationReadUsecase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(notificationId: string, userId: string): Promise<void> {
    console.info(`[MarkNotificationRead] Marking notification as read: ${notificationId}`);

    const notification = await this.notificationRepo.findById(notificationId);
    if (!notification) {
      throw new NotificationNotFoundError(notificationId);
    }

    // Verify ownership
    if (notification.userId !== userId) {
      throw new NotificationNotFoundError(notificationId);
    }

    notification.markAsRead();
    await this.notificationRepo.save(notification);

    console.info(`[MarkNotificationRead] Notification marked as read: ${notificationId}`);
  }
}

export class MarkAllNotificationsReadUsecase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string): Promise<void> {
    console.info(`[MarkAllNotificationsRead] Marking all notifications as read for user: ${userId}`);

    await this.notificationRepo.markAllAsRead(userId);

    console.info(`[MarkAllNotificationsRead] All notifications marked as read for user: ${userId}`);
  }
}
