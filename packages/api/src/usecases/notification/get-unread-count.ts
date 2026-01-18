import { NotificationRepository } from '../../infrastructure/repositories/notification-repository';

export class GetUnreadCountUsecase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string): Promise<number> {
    return this.notificationRepo.countUnreadByUserId(userId);
  }
}
