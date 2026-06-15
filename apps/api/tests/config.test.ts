import { describe, expect, it } from 'vitest';

import { loadApiRuntimeConfig } from '../src/infrastructure/config.js';

describe('API runtime configuration', () => {
  it('starts with a documented local configuration', () => {
    const config = loadApiRuntimeConfig({ NODE_ENV: 'test' });

    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(3000);
    expect(config.allowedOrigins).toEqual(['http://localhost:4321']);
    expect(Object.values(config.features)).toEqual([false, false, false, false, false]);
  });

  it('rejects wildcard CORS and malformed numeric settings', () => {
    expect(() =>
      loadApiRuntimeConfig({ NODE_ENV: 'production', CORS_ORIGINS: '*' }),
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
});
