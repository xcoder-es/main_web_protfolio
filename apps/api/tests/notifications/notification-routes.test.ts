import { describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { createApplicationDependencies } from '../../src/composition.js';
import type { ApiRuntimeConfig } from '../../src/infrastructure/config.js';
import {
  administratorHeaders,
  administratorIdentityOverrides,
} from '../support/identity.js';

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

const submission = {
  name: 'Grace Hopper',
  email: 'grace@example.com',
  subject: 'Notification workflow',
  message: 'Please validate the durable notification and manual retry workflow.',
  metadata: {
    idempotencyKey: 'browser-notification-route-0001',
    language: 'en',
    pageUrl: 'https://portfolio.example.com/contact',
    startedAt: '2026-06-15T11:58:00.000Z',
    consent: true,
  },
};

describe('notification administrator routes', () => {
  it('shows failed delivery separately while preserving the public lead response', async () => {
    const app = await buildApp(
      config,
      createApplicationDependencies(config, administratorIdentityOverrides()),
    );

    const lead = await app.inject({
      method: 'POST',
      url: '/api/public/contact',
      payload: submission,
    });
    expect(lead.statusCode).toBe(201);

    const listed = await app.inject({
      method: 'GET',
      url: '/api/admin/notifications?status=failed',
      headers: administratorHeaders,
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toHaveLength(1);
    const notificationId = listed.json()[0].id as string;

    const details = await app.inject({
      method: 'GET',
      url: `/api/admin/notifications/${notificationId}`,
      headers: administratorHeaders,
    });
    expect(details.statusCode).toBe(200);
    expect(details.json().notification.status).toBe('failed');
    expect(details.json().attempts).toHaveLength(1);

    const retry = await app.inject({
      method: 'POST',
      url: `/api/admin/notifications/${notificationId}/retry`,
      headers: administratorHeaders,
    });
    expect(retry.statusCode).toBe(200);
    expect(retry.json().status).toBe('failed');

    const afterRetry = await app.inject({
      method: 'GET',
      url: `/api/admin/notifications/${notificationId}`,
      headers: administratorHeaders,
    });
    expect(afterRetry.json().attempts).toHaveLength(2);
    await app.close();
  });

  it('returns stable errors for unknown notification filters and identifiers', async () => {
    const app = await buildApp(
      config,
      createApplicationDependencies(config, administratorIdentityOverrides()),
    );

    const invalidFilter = await app.inject({
      method: 'GET',
      url: '/api/admin/notifications?status=unknown',
      headers: administratorHeaders,
    });
    expect(invalidFilter.statusCode).toBe(400);
    expect(invalidFilter.json().code).toBe('INVALID_NOTIFICATION_FILTER');

    const missing = await app.inject({
      method: 'GET',
      url: '/api/admin/notifications/00000000-0000-4000-8000-000000000000',
      headers: administratorHeaders,
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().code).toBe('NOTIFICATION_NOT_FOUND');
    await app.close();
  });
});
