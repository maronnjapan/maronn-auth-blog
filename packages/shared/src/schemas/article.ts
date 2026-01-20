import { z } from 'zod';
import { uuidSchema, datetimeSchema } from './common';

export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/);

export const articleStatusSchema = z.enum([
  'pending_new',
  'pending_update',
  'published',
  'rejected',
  'deleted',
]);

export const targetCategorySchema = z.enum([
  'authentication',
  'authorization',
  'security',
]);

export const articleSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  slug: slugSchema,
  title: z.string().min(1).max(200),
  category: z.string().max(50).optional(),
  targetCategory: targetCategorySchema,
  status: articleStatusSchema,
  githubPath: z.string(),
  githubSha: z.string().optional(),
  publishedSha: z.string().optional(),
  rejectionReason: z.string().optional(),
  publishedAt: datetimeSchema.optional(),
  createdAt: datetimeSchema,
  updatedAt: datetimeSchema,
});

export const articleInputSchema = articleSchema.omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const articleResponseSchema = articleSchema.extend({
  tags: z.array(z.string()).optional(),
});

export const frontmatterSchema = z.object({
  title: z.string().min(1).max(200),
  published: z.boolean(),
  category: z.string().max(50).optional(),
  targetCategory: targetCategorySchema,
  tags: z.array(z.string().max(30)).max(10).optional(),
});

export type Article = z.infer<typeof articleSchema>;
export type ArticleInput = z.infer<typeof articleInputSchema>;
export type ArticleResponse = z.infer<typeof articleResponseSchema>;
export type ArticleStatus = z.infer<typeof articleStatusSchema>;
export type TargetCategory = z.infer<typeof targetCategorySchema>;
export type Frontmatter = z.infer<typeof frontmatterSchema>;
