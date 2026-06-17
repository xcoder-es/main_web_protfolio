import { describe, expect, it } from 'vitest';

import {
  createLoggerOptions,
  safeLogText,
  sensitiveLogPaths,
} from '../../src/security/logging.js';

describe('security logging', () => {
  it('serializes request metadata without raw URLs, headers or bodies', () => {
    const options = createLoggerOptions('production', 'info');
    const serialized = options.serializers.req({
      id: 'request-12345678',
      method: 'POST',
      url: '/api/public/payment-requests/private-token?email=ada@example.com',
      headers: { authorization: 'Bearer private-token' },
      body: { email: 'ada@example.com', message: 'private context' },
      routeOptions: { url: '/api/public/payment-requests/:publicToken' },
    });

    expect(serialized).toEqual({
      requestId: 'request-12345678',
      method: 'POST',
      route: '/api/public/payment-requests/:publicToken',
    });
    expect(JSON.stringify(serialized)).not.toContain('private-token');
    expect(JSON.stringify(serialized)).not.toContain('ada@example.com');
  });

  it('omits production stacks and sanitizes control characters', () => {
    const error = Object.assign(new Error('provider\nfailed\rwith details'), {
      code: 'PROVIDER_FAILURE',
      statusCode: 503,
    });
    const production = createLoggerOptions('production', 'info').serializers.err(error);
    const development = createLoggerOptions('development', 'debug').serializers.err(error);

    expect(production).toMatchObject({
      type: 'Error',
      message: 'provider failed with details',
      code: 'PROVIDER_FAILURE',
      statusCode: 503,
    });
    expect(production).not.toHaveProperty('stack');
    expect(development).toHaveProperty('stack');
    expect(safeLogText('line one\nline two\tvalue')).toBe('line one line two value');
  });

  it('maintains defense-in-depth redaction paths for credentials and personal data', () => {
    expect(sensitiveLogPaths).toContain('req.headers.authorization');
    expect(sensitiveLogPaths).toContain('*.clientSecret');
    expect(sensitiveLogPaths).toContain('*.turnstileToken');
    expect(sensitiveLogPaths).toContain('*.email');
    expect(sensitiveLogPaths).toContain('*.message');
  });
});
