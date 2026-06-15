import { describe, expect, it } from 'vitest';

import { parsePublicRuntimeConfig } from '../src/index.js';

describe('public configuration surface', () => {
  it('exposes only validated public URLs', () => {
    const parsed = parsePublicRuntimeConfig({
      siteUrl: 'https://portfolio.example.com',
      apiUrl: 'https://api.example.com',
    });
    expect(parsed).toEqual({
      siteUrl: 'https://portfolio.example.com',
      apiUrl: 'https://api.example.com',
    });
  });
});
