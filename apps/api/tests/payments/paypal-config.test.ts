import { describe, expect, it } from 'vitest';

import { loadApiRuntimeConfig } from '../../src/infrastructure/config.js';

describe('PayPal configuration hardening', () => {
  it('rejects unknown deployment modes instead of falling back silently', () => {
    expect(() =>
      loadApiRuntimeConfig({
        NODE_ENV: 'test',
        PAYPAL_MODE: 'production',
        PAYPAL_CLIENT_ID: 'client',
      }),
    ).toThrow('PAYPAL_MODE');
  });
});
