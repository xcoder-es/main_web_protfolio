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
    persistence: false,
    identity: false,
    notifications: false,
    payments: false,
    spamVerification: false,
  },
};

async function createLead() {
  const persistence = new InMemoryPersistence();
  const app = await buildApp(
    config,
    createApplicationDependencies(config, {
      persistence: { repositories: persistence.repositories, unitOfWork: persistence },
      ...administratorIdentityOverrides(),
    }),
  );
  const response = await app.inject({
    method: 'POST',
    url: '/api/public/contact',
    payload: {
      name: '=2+2',
      email: 'formula@example.com',
      subject: 'Security review',
      message: 'Please review this request for spreadsheet export safety.',
      metadata: {
        idempotencyKey: 'browser-request-hardening-0001',
        language: 'en',
        pageUrl: 'https://portfolio.example.com/contact',
        startedAt: '2026-06-15T11:58:00.000Z',
        consent: true,
      },
    },
  });
  return { app, persistence, leadId: response.json().leadId as string };
}

describe('administrator lead hardening', () => {
  it('returns validation errors for missing mutation bodies', async () => {
    const { app, leadId } = await createLead();

    const status = await app.inject({
      method: 'PATCH',
      url: `/api/admin/leads/${leadId}/status`,
      headers: administratorHeaders,
    });
    const note = await app.inject({
      method: 'POST',
      url: `/api/admin/leads/${leadId}/notes`,
      headers: administratorHeaders,
    });

    expect(status.statusCode).toBe(400);
    expect(status.json().code).toBe('VALIDATION_ERROR');
    expect(note.statusCode).toBe(400);
    expect(note.json().code).toBe('VALIDATION_ERROR');
    await app.close();
  });

  it('neutralizes spreadsheet formulas and audits bulk lead exports', async () => {
    const { app, persistence } = await createLead();
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/leads/export.csv?status=new&search=formula',
      headers: {
        ...administratorHeaders,
        'x-correlation-id': 'export-request-12345678',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("\"'=2+2\"");
    expect(response.body).not.toContain(',"=2+2"');
    const exportAudit = (await persistence.auditEvents.list()).find(
      (event) => event.action === 'lead.exported',
    );
    expect(exportAudit).toMatchObject({
      actorType: 'administrator',
      actorId: 'user_admin_123',
      entityType: 'lead_collection',
      correlationId: 'export-request-12345678',
      metadata: {
        resultCount: 1,
        statusFilter: 'new',
        typeFilter: null,
        searchApplied: true,
      },
    });
    expect(JSON.stringify(exportAudit)).not.toContain('formula@example.com');
    expect(JSON.stringify(exportAudit)).not.toContain('search=formula');
    await app.close();
  });
});
