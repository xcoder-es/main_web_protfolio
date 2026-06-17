import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { createApplicationDependencies } from '../../src/composition.js';
import type { ApiRuntimeConfig } from '../../src/infrastructure/config.js';
import { PaymentGatewayError } from '../../src/payments/application/ports.js';

const config: ApiRuntimeConfig = {
  environment: 'test',
  host: '127.0.0.1',
  port: 3000,
  logLevel: 'silent',
  trustProxy: false,
  allowedOrigins: ['https://portfolio.example.com'],
  bodyLimit: 65_536,
  rateLimitMax: 100,
  rateLimitWindowMs: 60_000,
  features: {
    persistence: false,
    identity: false,
    notifications: false,
    payments: false,
    spamVerification: false,
  },
};

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('public error sanitization', () => {
  it('replaces retryable provider details with a stable public message', async () => {
    const app = await buildApp(config, createApplicationDependencies(config));
    apps.push(app);
    app.get('/test-provider-retry', async () => {
      throw new PaymentGatewayError(
        'PAYPAL_TEMPORARY_FAILURE',
        'OAuth client secret abc123 failed at provider host internal.paypal.test',
        true,
      );
    });

    const response = await app.inject({ method: 'GET', url: '/test-provider-retry' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      code: 'PAYPAL_TEMPORARY_FAILURE',
      message: 'The payment service is temporarily unavailable.',
    });
    expect(response.body).not.toContain('abc123');
    expect(response.body).not.toContain('internal.paypal.test');
  });

  it('replaces non-retryable provider details with a stable public message', async () => {
    const app = await buildApp(config, createApplicationDependencies(config));
    apps.push(app);
    app.get('/test-provider-failure', async () => {
      throw new PaymentGatewayError(
        'PAYPAL_PROVIDER_REJECTED',
        'Provider response contained private payer and merchant details',
        false,
      );
    });

    const response = await app.inject({ method: 'GET', url: '/test-provider-failure' });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      code: 'PAYPAL_PROVIDER_REJECTED',
      message: 'The payment service could not complete the request.',
    });
    expect(response.body).not.toContain('payer');
    expect(response.body).not.toContain('merchant');
  });
});
