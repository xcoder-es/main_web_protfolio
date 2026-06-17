import { describe, expect, it } from 'vitest';

import { parsePublicRuntimeConfig } from '../src/index.js';
import { parsePrivateRuntimeConfig } from '../src/private-runtime.js';

describe('runtime configuration', () => {
  it('accepts valid browser-safe URLs', () => {
    expect(
      parsePublicRuntimeConfig({
        siteUrl: 'https://example.com',
        apiUrl: 'https://api.example.com',
      }),
    ).toEqual({ siteUrl: 'https://example.com', apiUrl: 'https://api.example.com' });
  });

  it('rejects invalid public configuration', () => {
    expect(() =>
      parsePublicRuntimeConfig({ siteUrl: 'not-a-url', apiUrl: 'also-invalid' }),
    ).toThrow();
  });

  it('returns actionable private configuration errors', () => {
    expect(() =>
      parsePrivateRuntimeConfig({
        environment: 'production',
        host: '',
        port: 70000,
        features: {},
      }),
    ).toThrow(/Invalid configuration/);
  });
});
