import { z } from 'zod';
import { uuidSchema, datetimeSchema } from './common';

export const userRoleSchema = z.enum(['user', 'admin']);

export const userSchema = z.object({
  id: uuidSchema,
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  displayName: z.string().min(1).max(100),
  iconUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  githubUserId: z.string(),
  githubInstallationId: z.string().optional(),
  role: userRoleSchema,
  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
});

export const userInputSchema = userSchema.pick({
  username: true,
  displayName: true,
  iconUrl: true,
  bio: true,
});

export const userResponseSchema = userSchema;

export type User = z.infer<typeof userSchema>;
export type UserInput = z.infer<typeof userInputSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
