import { z } from 'zod';

export const sortDirectionSchema = z.enum(['asc', 'desc']);

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sortDirection: sortDirectionSchema.default('desc'),
  })
  .strict();

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function createPaginatedResultSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z
    .object({
      items: z.array(itemSchema),
      page: z.number().int().min(1),
      pageSize: z.number().int().min(1).max(100),
      totalItems: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    })
    .strict();
}

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
