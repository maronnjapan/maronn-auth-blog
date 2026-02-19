import { z } from 'zod';
import { uuidSchema, datetimeSchema } from './common';

export const notificationSettingsSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  emailNotifications: z.boolean(),
  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
});

export const notificationSettingsInputSchema = z.object({
  emailNotifications: z.boolean(),
});

export const notificationSettingsResponseSchema = notificationSettingsSchema;

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsInputSchema>;
export type NotificationSettingsResponse = z.infer<typeof notificationSettingsResponseSchema>;
