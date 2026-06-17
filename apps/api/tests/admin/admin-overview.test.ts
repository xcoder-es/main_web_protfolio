import { describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { createApplicationDependencies } from '../../src/composition.js';
import type { ApiRuntimeConfig } from '../../src/infrastructure/config.js';
import { InMemoryPersistence } from '../../src/persistence/adapters/in-memory/in-memory-persistence.js';
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
    persistence: true,
    identity: true,
    notifications: false,
    payments: false,
    spamVerification: false,
  },
};

function harness() {
  const persistence = new InMemoryPersistence();
  const dependencies = createApplicationDependencies(config, {
    persistence: { repositories: persistence.repositories, unitOfWork: persistence },
    ...administratorIdentityOverrides(),
    clock: { now: () => new Date('2026-06-17T14:00:00.000Z') },
  });
  return { persistence, dependencies };
}

describe('administrator overview routes', () => {
  it('keeps diagnostics and global audit data behind administrator authentication', async () => {
    const { dependencies } = harness();
    const app = await buildApp(config, dependencies);

    const diagnostics = await app.inject({ method: 'GET', url: '/api/admin/diagnostics' });
    const audit = await app.inject({ method: 'GET', url: '/api/admin/audit' });

    expect(diagnostics.statusCode).toBe(401);
    expect(audit.statusCode).toBe(401);
    expect(diagnostics.json().code).toBe('AUTHENTICATION_REQUIRED');
    await app.close();
  });

  it('returns secret-free capability diagnostics to an authorised administrator', async () => {
    const { dependencies } = harness();
    const app = await buildApp(config, dependencies);

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/diagnostics',
      headers: administratorHeaders,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ready: true,
      generatedAt: '2026-06-17T14:00:00.000Z',
      checks: [
        { name: 'persistence', state: 'ready', required: true },
        { name: 'identity', state: 'ready', required: true },
        { name: 'notifications', state: 'disabled', required: false },
        { name: 'payments', state: 'disabled', required: false },
        { name: 'spam-verification', state: 'disabled', required: false },
      ],
    });
    expect(JSON.stringify(response.json())).not.toContain('secret');
    expect(JSON.stringify(response.json())).not.toContain('token');
    await app.close();
  });

  it('sorts and filters the administrator audit timeline', async () => {
    const { persistence, dependencies } = harness();
    await persistence.auditEvents.insert({
      id: 'audit-1',
      actorType: 'visitor',
      action: 'lead.submitted',
      entityType: 'lead',
      entityId: 'lead-1',
      correlationId: 'correlation-1',
      metadata: { status: 'new' },
      createdAt: new Date('2026-06-17T12:00:00.000Z'),
    });
    await persistence.auditEvents.insert({
      id: 'audit-2',
      actorType: 'administrator',
      actorId: 'user_admin_123',
      action: 'lead.status_changed',
      entityType: 'lead',
      entityId: 'lead-1',
      correlationId: 'correlation-2',
      metadata: { status: 'reviewing' },
      createdAt: new Date('2026-06-17T13:00:00.000Z'),
    });
    await persistence.auditEvents.insert({
      id: 'audit-3',
      actorType: 'administrator',
      actorId: 'user_admin_123',
      action: 'payment.request.created',
      entityType: 'payment_request',
      entityId: 'payment-1',
      correlationId: 'correlation-3',
      metadata: { currency: 'EUR' },
      createdAt: new Date('2026-06-17T13:30:00.000Z'),
    });
    const app = await buildApp(config, dependencies);

    const all = await app.inject({
      method: 'GET',
      url: '/api/admin/audit?limit=2',
      headers: administratorHeaders,
    });
    const leadStatus = await app.inject({
      method: 'GET',
      url: '/api/admin/audit?entityType=lead&entityId=lead-1&action=status',
      headers: administratorHeaders,
    });

    expect(all.statusCode).toBe(200);
    expect(all.json().map((event: { id: string }) => event.id)).toEqual(['audit-3', 'audit-2']);
    expect(leadStatus.statusCode).toBe(200);
    expect(leadStatus.json()).toHaveLength(1);
    expect(leadStatus.json()[0]).toMatchObject({ id: 'audit-2', action: 'lead.status_changed' });
    await app.close();
  });
});
