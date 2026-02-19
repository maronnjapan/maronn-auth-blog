import { z } from 'zod';
import { uuidSchema, datetimeSchema } from './common';

export const followSchema = z.object({
  id: uuidSchema,
  followerId: uuidSchema,
  followingId: uuidSchema,
  createdAt: datetimeSchema,
});

export const followResponseSchema = followSchema;

export const followStatusResponseSchema = z.object({
  isFollowing: z.boolean(),
  followerCount: z.number().int().min(0),
  followingCount: z.number().int().min(0),
});

export const followCountResponseSchema = z.object({
  followerCount: z.number().int().min(0),
  followingCount: z.number().int().min(0),
});

export type Follow = z.infer<typeof followSchema>;
export type FollowResponse = z.infer<typeof followResponseSchema>;
export type FollowStatusResponse = z.infer<typeof followStatusResponseSchema>;
export type FollowCountResponse = z.infer<typeof followCountResponseSchema>;
