import { describe, expect, it } from 'vitest';

import { featureFlagsSchema } from '../src/runtime.js';

describe('feature flags', () => {
  it('requires an explicit boolean for every provider capability', () => {
    expect(
      featureFlagsSchema.parse({
        persistence: true,
        identity: false,
        notifications: false,
        payments: false,
        spamVerification: false,
      }),
    ).toBeDefined();

    expect(() => featureFlagsSchema.parse({ persistence: true })).toThrow();
  });
});
