import { NotificationSettingsRepository } from '../../infrastructure/repositories/notification-settings-repository';
import type { NotificationSettings } from '../../domain/entities/notification-settings';

export interface UpdateNotificationSettingsInput {
  userId: string;
  emailNotifications: boolean;
}

export class UpdateNotificationSettingsUsecase {
  constructor(private settingsRepo: NotificationSettingsRepository) {}

  async execute(input: UpdateNotificationSettingsInput): Promise<NotificationSettings> {
    console.info(`[UpdateNotificationSettings] Updating settings for user: ${input.userId}`);

    const settings = await this.settingsRepo.getOrCreate(input.userId);

    settings.updateSettings({
      emailNotifications: input.emailNotifications,
    });

    await this.settingsRepo.save(settings);

    console.info(`[UpdateNotificationSettings] Settings updated for user: ${input.userId}`);
    return settings;
  }
}
