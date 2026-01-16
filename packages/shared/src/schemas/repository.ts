import { z } from 'zod';
import { uuidSchema, datetimeSchema } from './common';

export const repositorySchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  githubRepoFullName: z.string().regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/),
  createdAt: datetimeSchema,
});

export const repositoryInputSchema = z.object({
  githubRepoFullName: z.string().regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/),
});

export type Repository = z.infer<typeof repositorySchema>;
export type RepositoryInput = z.infer<typeof repositoryInputSchema>;
