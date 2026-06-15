import { describe, expect, it } from 'vitest';
import { getHealthStatus } from '../src/server.js';

describe('API application shell', () => {
  it('exposes deterministic service health metadata', () => {
    expect(getHealthStatus()).toEqual({
      status: 'ok',
      service: 'carlos-pinto-consulting-api',
      version: '0.1.0',
    });
  });
});
