import { NotificationRepository } from '../../infrastructure/repositories/notification-repository';
import type { PaginatedResponse } from '@maronn-auth-blog/shared';
import type { Notification } from '../../domain/entities/notification';

export interface GetNotificationsInput {
  userId: string;
  page: number;
  limit: number;
}

export class GetNotificationsUsecase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(input: GetNotificationsInput): Promise<PaginatedResponse<Notification>> {
    const { userId, page, limit } = input;
    const offset = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.notificationRepo.findByUserId(userId, limit, offset),
      this.notificationRepo.countByUserId(userId),
    ]);

    return {
      items: notifications,
      total,
      page,
      limit,
      hasMore: offset + notifications.length < total,
    };
  }
}
