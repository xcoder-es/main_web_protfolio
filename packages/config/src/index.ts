import { z } from 'zod';

export const runtimeEnvironmentSchema = z.enum(['development', 'test', 'production']);

export const publicRuntimeConfigSchema = z.object({
  siteUrl: z.string().url(),
  apiUrl: z.string().url(),
});

export type RuntimeEnvironment = z.infer<typeof runtimeEnvironmentSchema>;
export type PublicRuntimeConfig = z.infer<typeof publicRuntimeConfigSchema>;

export function parsePublicRuntimeConfig(input: unknown): PublicRuntimeConfig {
  return publicRuntimeConfigSchema.parse(input);
}

export type FeatureState = {
  enabled: boolean;
  reason?: string;
};
