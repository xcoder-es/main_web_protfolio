import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.js';
import { createApplicationDependencies } from '../src/composition.js';
import type { ApiRuntimeConfig } from '../src/infrastructure/config.js';

const apps: FastifyInstance[] = [];

function config(overrides: Partial<ApiRuntimeConfig> = {}): ApiRuntimeConfig {
  return {
    environment: 'test',
    host: '127.0.0.1',
    port: 3000,
    logLevel: 'silent',
    trustProxy: false,
    allowedOrigins: ['https://portfolio.example.com'],
    bodyLimit: 256,
    rateLimitMax: 100,
    rateLimitWindowMs: 60_000,
    features: {
      persistence: false,
      identity: false,
      notifications: false,
      payments: false,
      spamVerification: false,
    },
    ...overrides,
  };
}

async function createApp(runtime = config()): Promise<FastifyInstance> {
  const app = await buildApp(runtime, createApplicationDependencies(runtime));
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('Fastify API foundation', () => {
  it('returns health metadata and propagates valid correlation IDs', async () => {
    const app = await createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-correlation-id': 'request-12345678' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-correlation-id']).toBe('request-12345678');
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'carlos-pinto-consulting-api',
      version: '0.1.0',
    });
  });

  it('reports disabled optional capabilities as ready', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json().ready).toBe(true);
    expect(response.json().checks).toHaveLength(5);
  });

  it('fails readiness when an enabled capability has no adapter', async () => {
    const runtime = config({
      features: {
        persistence: true,
        identity: false,
        notifications: false,
        payments: false,
        spamVerification: false,
      },
    });
    const app = await createApp(runtime);
    const response = await app.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json().ready).toBe(false);
  });

  it('applies strict CORS and security headers', async () => {
    const app = await createApp();
    const allowed = await app.inject({
      method: 'GET',
      url: '/api/public/status',
      headers: { origin: 'https://portfolio.example.com' },
    });

    expect(allowed.statusCode).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://portfolio.example.com');
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');

    const denied = await app.inject({
      method: 'GET',
      url: '/api/public/status',
      headers: { origin: 'https://attacker.example' },
    });
    expect(denied.statusCode).toBe(500);
    expect(denied.json().code).toBe('INTERNAL_ERROR');
  });

  it('returns stable not-found and internal error responses', async () => {
    const app = await createApp();
    app.get('/test-error', async () => {
      throw new Error('sensitive internal message');
    });

    const missing = await app.inject({ method: 'GET', url: '/missing' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().code).toBe('ROUTE_NOT_FOUND');
    expect(missing.json().correlationId).toBeTruthy();

    const failed = await app.inject({ method: 'GET', url: '/test-error' });
    expect(failed.statusCode).toBe(500);
    expect(failed.body).not.toContain('sensitive internal message');
    expect(failed.json().code).toBe('INTERNAL_ERROR');
  });

  it('enforces payload and request-rate limits', async () => {
    const app = await createApp(config({ rateLimitMax: 1 }));
    app.post('/test-body', async () => ({ accepted: true }));

    const oversized = await app.inject({
      method: 'POST',
      url: '/test-body',
      headers: { 'content-type': 'application/json' },
      payload: { value: 'x'.repeat(500) },
    });
    expect(oversized.statusCode).toBe(413);
    expect(oversized.json().code).toBe('PAYLOAD_TOO_LARGE');

    const first = await app.inject({ method: 'GET', url: '/api/admin/status' });
    const second = await app.inject({ method: 'GET', url: '/api/admin/status' });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
    expect(second.json().code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('generates OpenAPI and keeps route groups separate', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/openapi.json' });
    const document = response.json();

    expect(response.statusCode).toBe(200);
    expect(document.openapi).toMatch(/^3\./);
    expect(document.paths['/health']).toBeDefined();
    expect(document.paths['/api/public/status']).toBeDefined();
    expect(document.paths['/api/admin/status']).toBeDefined();
    expect(document.paths['/api/webhooks/status']).toBeDefined();
  });
});
