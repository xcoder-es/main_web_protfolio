import { z } from 'zod';

import { correlationIdSchema } from './identifiers.js';

export const apiErrorCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);

export const fieldErrorsSchema = z.record(z.string(), z.array(z.string().min(1)).min(1));

export const apiErrorSchema = z
  .object({
    code: apiErrorCodeSchema,
    message: z.string().trim().min(1).max(500),
    correlationId: correlationIdSchema,
    fieldErrors: fieldErrorsSchema.optional(),
  })
  .strict();

export type ApiError = z.infer<typeof apiErrorSchema>;

export function createApiError(input: ApiError): ApiError {
  return apiErrorSchema.parse(input);
}
