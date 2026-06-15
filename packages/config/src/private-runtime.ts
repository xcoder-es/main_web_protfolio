import { z } from 'zod';

import { featureFlagsSchema } from './runtime.js';
import { ConfigurationError } from './validation-error.js';

export const privateRuntimeConfigSchema = z.object({
  environment: z.enum(['development', 'test', 'production']),
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  features: featureFlagsSchema,
});

export type PrivateRuntimeConfig = z.infer<typeof privateRuntimeConfigSchema>;

export function parsePrivateRuntimeConfig(input: unknown): PrivateRuntimeConfig {
  const parsed = privateRuntimeConfigSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new ConfigurationError(parsed.error);
}
