import { z } from 'zod';
import { uuidSchema, datetimeSchema } from './common';

export const userSchema = z.object({
  id: uuidSchema,
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  displayName: z.string().min(1).max(100),
  iconUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  githubUserId: z.string(),
  githubInstallationId: z.string().optional(),
  githubUrl: z.string().url().optional(),
  twitterUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
});

export const userInputSchema = userSchema.pick({
  username: true,
  displayName: true,
  iconUrl: true,
  bio: true,
  githubUrl: true,
  twitterUrl: true,
  websiteUrl: true,
});

export const userResponseSchema = userSchema;

export type User = z.infer<typeof userSchema>;
export type UserInput = z.infer<typeof userInputSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
