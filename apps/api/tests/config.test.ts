import { describe, expect, it } from 'vitest';

import { loadApiRuntimeConfig } from '../src/infrastructure/config.js';

describe('API runtime configuration', () => {
  it('starts with a documented local configuration', () => {
    const config = loadApiRuntimeConfig({ NODE_ENV: 'test' });

    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(3000);
    expect(config.allowedOrigins).toEqual(['http://localhost:4321']);
    expect(Object.values(config.features)).toEqual([false, false, false, false, false]);
    expect(config.identity).toBeUndefined();
    expect(config.payment).toBeUndefined();
  });

  it('rejects wildcard origins and malformed numeric settings', () => {
    expect(() => loadApiRuntimeConfig({ NODE_ENV: 'production', CORS_ORIGINS: '*' })).toThrow(
      'wildcard',
    );
    expect(() =>
      loadApiRuntimeConfig({
        NODE_ENV: 'test',
        CLERK_AUTHORIZED_PARTIES: '*',
      }),
    ).toThrow('wildcard');
    expect(() => loadApiRuntimeConfig({ NODE_ENV: 'test', PORT: 'not-a-port' })).toThrow();
    expect(() => loadApiRuntimeConfig({ NODE_ENV: 'test', RATE_LIMIT_MAX: '0' })).toThrow(
      'RATE_LIMIT_MAX',
    );
  });

  it('parses feature switches and multiple allowed origins', () => {
    const config = loadApiRuntimeConfig({
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://portfolio.example,https://admin.example',
      PERSISTENCE_ENABLED: 'true',
      TRUST_PROXY: 'true',
    });

    expect(config.features.persistence).toBe(true);
    expect(config.trustProxy).toBe(true);
    expect(config.allowedOrigins).toHaveLength(2);
  });

  it('parses Clerk credentials, authorized parties and administrator allowlists', () => {
    const config = loadApiRuntimeConfig({
      NODE_ENV: 'test',
      CLERK_SECRET_KEY: 'sk_test_example',
      CLERK_PUBLISHABLE_KEY: 'pk_test_example',
      CLERK_JWT_KEY: '-----BEGIN PUBLIC KEY-----example',
      CLERK_AUTHORIZED_PARTIES: 'https://portfolio.example.com, https://staging.example.com',
      CLERK_ADMIN_USER_IDS: 'user_123,user_456',
      CLERK_ADMIN_EMAILS: 'ADMIN@EXAMPLE.COM,owner@example.com',
    });

    expect(config.identity).toEqual({
      clerkSecretKey: 'sk_test_example',
      clerkPublishableKey: 'pk_test_example',
      clerkJwtKey: '-----BEGIN PUBLIC KEY-----example',
      authorizedParties: ['https://portfolio.example.com', 'https://staging.example.com'],
      administratorUserIds: ['user_123', 'user_456'],
      administratorEmails: ['admin@example.com', 'owner@example.com'],
    });
  });

  it('selects sandbox and live PayPal API origins explicitly', () => {
    const sandbox = loadApiRuntimeConfig({
      NODE_ENV: 'test',
      PAYPAL_MODE: 'sandbox',
      PAYPAL_CLIENT_ID: 'sandbox-client',
      PAYPAL_CLIENT_SECRET: 'sandbox-secret',
      PAYPAL_WEBHOOK_ID: 'sandbox-webhook',
    });
    const live = loadApiRuntimeConfig({
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://portfolio.example.com',
      PAYPAL_MODE: 'live',
      PAYPAL_CLIENT_ID: 'live-client',
      PAYPAL_CLIENT_SECRET: 'live-secret',
      PAYPAL_WEBHOOK_ID: 'live-webhook',
    });

    expect(sandbox.payment).toEqual({
      mode: 'sandbox',
      clientId: 'sandbox-client',
      clientSecret: 'sandbox-secret',
      webhookId: 'sandbox-webhook',
      baseUrl: 'https://api-m.sandbox.paypal.com',
    });
    expect(live.payment).toEqual({
      mode: 'live',
      clientId: 'live-client',
      clientSecret: 'live-secret',
      webhookId: 'live-webhook',
      baseUrl: 'https://api-m.paypal.com',
    });
  });
});
