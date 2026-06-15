import { z } from 'zod';

export const featureFlagsSchema = z.object({
  persistence: z.boolean(),
  identity: z.boolean(),
  notifications: z.boolean(),
  payments: z.boolean(),
  spamVerification: z.boolean(),
});

export type FeatureFlags = z.infer<typeof featureFlagsSchema>;
