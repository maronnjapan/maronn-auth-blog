import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const datetimeSchema = z.string().datetime();

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;
