import { z } from 'zod';
import { uuidSchema, datetimeSchema } from './common';

const optionalUrlSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional()
);

export const userSchema = z.object({
  id: uuidSchema,
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  displayName: z.string().min(1).max(100),
  iconUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  githubUserId: z.string(),
  auth0UserId: z.string().optional(),
  githubInstallationId: z.string().optional(),
  githubUrl: optionalUrlSchema,
  twitterUrl: optionalUrlSchema,
  websiteUrl: optionalUrlSchema,
  googleAnalyticsId: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().regex(/^G-[A-Z0-9]+$/, 'Google Analytics の測定 ID は G- で始まる必要があります').optional()
  ),
  cfWebAnalyticsToken: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().regex(/^[a-f0-9]{32}$/, 'Cloudflare Web Analytics トークンは32文字の16進数です').optional()
  ),
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
  googleAnalyticsId: true,
  cfWebAnalyticsToken: true,
});

export const userResponseSchema = userSchema;

export type User = z.infer<typeof userSchema>;
export type UserInput = z.infer<typeof userInputSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
