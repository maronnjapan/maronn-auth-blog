import { NotificationSettingsRepository } from '../../infrastructure/repositories/notification-settings-repository';
import type { NotificationSettings } from '../../domain/entities/notification-settings';

export class GetNotificationSettingsUsecase {
  constructor(private settingsRepo: NotificationSettingsRepository) {}

  async execute(userId: string): Promise<NotificationSettings> {
    return this.settingsRepo.getOrCreate(userId);
  }
}
