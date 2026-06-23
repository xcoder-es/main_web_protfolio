import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { createApplicationDependencies, type ApplicationOverrides } from '../src/composition.js';
import type { ApiRuntimeConfig } from '../src/infrastructure/config.js';
import { administratorHeaders, administratorIdentityOverrides } from './support/identity.js';

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

async function createApp(
  runtime = config(),
  overrides: ApplicationOverrides = {},
): Promise<FastifyInstance> {
  const app = await buildApp(runtime, createApplicationDependencies(runtime, overrides));
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

  it('reports readiness without exposing capability names publicly', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/ready' });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload).toMatchObject({
      ready: true,
      status: 'ready',
      service: 'carlos-pinto-consulting-api',
      version: '0.1.0',
    });
    expect(payload.generatedAt).toBeTruthy();
    expect(payload.durationMs).toBeTypeOf('number');
    expect(payload.checks).toBeUndefined();
  });

  it('fails readiness when an enabled capability has no adapter', async () => {
    const runtime = config({
      features: {
        persistence: false,
        identity: true,
        notifications: false,
        payments: false,
        spamVerification: false,
      },
    });
    const app = await createApp(runtime);
    const response = await app.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ ready: false, status: 'not_ready' });
    expect(response.json().checks).toBeUndefined();
  });

  it('fails readiness when persistence is enabled without Supabase database configuration', async () => {
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
    expect(response.json()).toMatchObject({ ready: false, status: 'not_ready' });
    expect(response.body).not.toContain('persistence');
  });

  it('applies strict CORS, CSP, privacy and anti-cache headers', async () => {
    const app = await createApp();
    const allowed = await app.inject({
      method: 'GET',
      url: '/api/public/status',
      headers: { origin: 'https://portfolio.example.com' },
    });

    expect(allowed.statusCode).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://portfolio.example.com');
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');
    expect(allowed.headers['content-security-policy']).toContain("default-src 'none'");
    expect(allowed.headers['referrer-policy']).toBe('no-referrer');
    expect(allowed.headers['cache-control']).toBe('no-store, max-age=0');
    expect(allowed.headers['x-robots-tag']).toContain('noindex');
    expect(allowed.headers['permissions-policy']).toContain('camera=()');

    const denied = await app.inject({
      method: 'GET',
      url: '/api/public/status',
      headers: { origin: 'https://attacker.example' },
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().code).toBe('ORIGIN_NOT_ALLOWED');
    expect(denied.body).not.toContain('attacker.example');
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
    expect(failed.body).not.toContain('stack');
    expect(failed.json().code).toBe('INTERNAL_ERROR');
  });

  it('enforces payload and request-rate limits', async () => {
    const app = await createApp(config({ rateLimitMax: 1 }), administratorIdentityOverrides());
    app.post('/test-body', async () => ({ accepted: true }));

    const oversized = await app.inject({
      method: 'POST',
      url: '/test-body',
      headers: { 'content-type': 'application/json' },
      payload: { value: 'x'.repeat(500) },
    });
    expect(oversized.statusCode).toBe(413);
    expect(oversized.json().code).toBe('PAYLOAD_TOO_LARGE');

    const first = await app.inject({
      method: 'GET',
      url: '/api/admin/status',
      headers: administratorHeaders,
    });
    const second = await app.inject({
      method: 'GET',
      url: '/api/admin/status',
      headers: administratorHeaders,
    });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
    expect(second.json().code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('generates OpenAPI when explicitly available outside production', async () => {
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

  it('hides OpenAPI by default in production', async () => {
    const app = await createApp(
      config({
        environment: 'production',
        logLevel: 'silent',
        trustProxy: true,
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/openapi.json' });
    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('ROUTE_NOT_FOUND');
  });
});
