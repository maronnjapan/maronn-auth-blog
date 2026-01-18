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

export const installationRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  fullName: z.string(),
  owner: z.string(),
  description: z.string().nullable(),
  isPrivate: z.boolean(),
  defaultBranch: z.string(),
  htmlUrl: z.string().url(),
  pushedAt: z.string().nullable(),
});

export const validateRepositoryResponseSchema = z.object({
  isValid: z.boolean(),
  repository: installationRepositorySchema.nullable(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type Repository = z.infer<typeof repositorySchema>;
export type RepositoryInput = z.infer<typeof repositoryInputSchema>;
export type InstallationRepository = z.infer<typeof installationRepositorySchema>;
export type ValidateRepositoryResponse = z.infer<typeof validateRepositoryResponseSchema>;
