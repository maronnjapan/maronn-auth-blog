import { z } from 'zod';
import { uuidSchema, datetimeSchema } from './common';

export const commentSchema = z.object({
  id: uuidSchema,
  articleId: uuidSchema,
  userId: uuidSchema,
  bodyMarkdown: z.string().min(1).max(10000),
  bodyHtml: z.string(),
  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
});

export const commentInputSchema = z.object({
  bodyMarkdown: z.string().min(1).max(10000),
});

export const commentResponseSchema = commentSchema.extend({
  author: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
    iconUrl: z.string().optional(),
  }).optional(),
});

export const commentsListResponseSchema = z.object({
  comments: z.array(commentResponseSchema),
  total: z.number().int().min(0),
});

export type Comment = z.infer<typeof commentSchema>;
export type CommentInput = z.infer<typeof commentInputSchema>;
export type CommentResponse = z.infer<typeof commentResponseSchema>;
export type CommentsListResponse = z.infer<typeof commentsListResponseSchema>;
