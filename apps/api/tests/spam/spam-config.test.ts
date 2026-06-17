import { describe, expect, it } from 'vitest';

import { loadApiRuntimeConfig } from '../../src/infrastructure/config.js';

describe('form protection configuration', () => {
  it('leaves optional spam configuration absent by default', () => {
    const config = loadApiRuntimeConfig({ NODE_ENV: 'test' });

    expect(config.spam).toBeUndefined();
  });

  it('parses Turnstile and form timing settings', () => {
    const config = loadApiRuntimeConfig({
      NODE_ENV: 'test',
      TURNSTILE_SECRET_KEY: 'test-secret',
      TURNSTILE_ALLOWED_HOSTNAMES: 'portfolio.example.com,staging.example.com',
      TURNSTILE_SITEVERIFY_URL: 'https://turnstile.example.test/siteverify',
      FORM_MINIMUM_COMPLETION_MS: '1500',
      FORM_MAXIMUM_COMPLETION_MS: '3600000',
    });

    expect(config.spam).toEqual({
      turnstileSecretKey: 'test-secret',
      allowedHostnames: ['portfolio.example.com', 'staging.example.com'],
      siteverifyUrl: 'https://turnstile.example.test/siteverify',
      minimumCompletionMs: 1500,
      maximumCompletionMs: 3600000,
    });
  });

  it('rejects wildcard hostnames and invalid timing windows', () => {
    expect(() =>
      loadApiRuntimeConfig({
        NODE_ENV: 'test',
        TURNSTILE_ALLOWED_HOSTNAMES: '*',
      }),
    ).toThrow('exact hostnames');

    expect(() =>
      loadApiRuntimeConfig({
        NODE_ENV: 'test',
        FORM_MINIMUM_COMPLETION_MS: '5000',
        FORM_MAXIMUM_COMPLETION_MS: '1000',
      }),
    ).toThrow('must exceed');
  });
});
