import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateNotificationSettingsUsecase } from './update-notification-settings';
import type { NotificationSettingsRepository } from '../../infrastructure/repositories/notification-settings-repository';
import { NotificationSettings } from '../../domain/entities/notification-settings';

describe('UpdateNotificationSettingsUsecase', () => {
  let settingsRepo: NotificationSettingsRepository;
  let usecase: UpdateNotificationSettingsUsecase;

  const mockSettings = new NotificationSettings({
    id: 'settings-1',
    userId: 'user-1',
    emailNotifications: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    settingsRepo = {
      getOrCreate: vi.fn().mockResolvedValue(mockSettings),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationSettingsRepository;
    usecase = new UpdateNotificationSettingsUsecase(settingsRepo);
  });

  it('updates email notification setting', async () => {
    const result = await usecase.execute({
      userId: 'user-1',
      emailNotifications: true,
    });

    expect(settingsRepo.getOrCreate).toHaveBeenCalledWith('user-1');
    expect(settingsRepo.save).toHaveBeenCalled();
    expect(result.emailNotifications).toBe(true);
  });

  it('creates settings if they do not exist', async () => {
    const newSettings = new NotificationSettings({
      id: 'settings-new',
      userId: 'user-2',
      emailNotifications: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (settingsRepo.getOrCreate as ReturnType<typeof vi.fn>).mockResolvedValue(newSettings);

    const result = await usecase.execute({
      userId: 'user-2',
      emailNotifications: false,
    });

    expect(result.emailNotifications).toBe(false);
    expect(settingsRepo.save).toHaveBeenCalled();
  });
});
