import { z } from 'zod';
import { uuidSchema, datetimeSchema } from './common';

export const notificationTypeSchema = z.enum([
  'article_approved',
  'article_rejected',
  'article_update_detected',
  'github_integration_error',
  'new_article_from_followed',
]);

export const notificationSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  type: notificationTypeSchema,
  articleId: uuidSchema.optional(),
  message: z.string().min(1).max(500),
  readAt: datetimeSchema.optional(),
  createdAt: datetimeSchema,
});

export const notificationResponseSchema = notificationSchema;

export const notificationsListResponseSchema = z.object({
  notifications: z.array(notificationResponseSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  hasMore: z.boolean(),
});

export const unreadCountResponseSchema = z.object({
  count: z.number().int().min(0),
});

export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
export type NotificationsListResponse = z.infer<typeof notificationsListResponseSchema>;
export type UnreadCountResponse = z.infer<typeof unreadCountResponseSchema>;
