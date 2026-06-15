import type { Clock, ContactSubmission, IdGenerator } from '@carlos-pinto/contracts';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { createApplicationDependencies } from '../../src/composition.js';
import type { ApiRuntimeConfig } from '../../src/infrastructure/config.js';
import { LeadApplicationError } from '../../src/leads/application/errors.js';
import { LeadsService } from '../../src/leads/application/service.js';
import { InMemoryPersistence } from '../../src/persistence/adapters/in-memory/in-memory-persistence.js';
import {
  administratorHeaders,
  administratorIdentityOverrides,
} from '../support/identity.js';

const now = new Date('2026-06-15T12:00:00.000Z');
const clock: Clock = { now: () => new Date(now) };

function sequentialIds(): IdGenerator {
  let next = 1;
  return {
    generate: () => `00000000-0000-4000-8000-${String(next++).padStart(12, '0')}`,
  };
}

function contact(idempotencyKey = 'browser-request-0001'): ContactSubmission {
  return {
    name: 'Ada Lovelace',
    email: 'ADA@EXAMPLE.COM',
    subject: 'Architecture advisory',
    message: 'I need help shaping a production-ready digital platform architecture.',
    metadata: {
      idempotencyKey,
      language: 'en',
      pageUrl: 'https://portfolio.example.com/contact',
      startedAt: '2026-06-15T11:58:00.000Z',
      consent: true,
    },
  };
}

function service() {
  const persistence = new InMemoryPersistence();
  return {
    persistence,
    leads: new LeadsService({
      leads: persistence.leads,
      notes: persistence.leadNotes,
      audit: persistence.auditEvents,
      unitOfWork: persistence,
      clock,
      ids: sequentialIds(),
    }),
  };
}

const visitor = { type: 'visitor' as const, correlationId: 'request-visitor-0001' };
const administrator = {
  type: 'administrator' as const,
  id: 'admin-1',
  correlationId: 'request-admin-0001',
};

describe('lead application workflows', () => {
  it('persists a public submission exactly once and audits only the creation', async () => {
    const { leads, persistence } = service();

    const first = await leads.submitContact(contact(), visitor);
    const duplicate = await leads.submitContact(contact(), visitor);

    expect(first.created).toBe(true);
    expect(duplicate.created).toBe(false);
    expect(duplicate.lead.id).toBe(first.lead.id);
    expect((await persistence.leads.list())).toHaveLength(1);
    expect(await persistence.auditEvents.listByEntity('lead', first.lead.id)).toHaveLength(1);
    expect(first.lead.email).toBe('ada@example.com');
  });

  it('enforces transitions and records notes and administrator actions', async () => {
    const { leads } = service();
    const submitted = await leads.submitContact(contact(), visitor);

    await leads.changeStatus(submitted.lead.id, 'qualified', administrator);
    await leads.changeStatus(submitted.lead.id, 'won', administrator);
    const note = await leads.addNote(submitted.lead.id, 'Contract discussion completed.', administrator);
    const details = await leads.getLead(submitted.lead.id);

    expect(details.lead.status).toBe('won');
    expect(details.notes).toEqual([note]);
    expect(details.audit.map((event) => event.action)).toEqual([
      'lead.submitted',
      'lead.status_changed',
      'lead.status_changed',
      'lead.note_added',
    ]);

    await expect(leads.changeStatus(submitted.lead.id, 'new', administrator)).rejects.toMatchObject({
      code: 'INVALID_LEAD_TRANSITION',
      statusCode: 409,
    } satisfies Partial<LeadApplicationError>);
  });

  it('filters leads and exports safe CSV rows', async () => {
    const { leads } = service();
    const first = await leads.submitContact(contact('browser-request-0002'), visitor);
    await leads.submitProject(
      {
        name: 'Grace Hopper',
        email: 'grace@example.com',
        company: 'Compiler Labs',
        projectType: 'ai-engineering',
        summary: 'Build an AI engineering platform with secure operational controls.',
        budgetRange: '15k-50k',
        timeline: 'one-to-three-months',
        metadata: {
          idempotencyKey: 'browser-request-0003',
          language: 'en',
          pageUrl: 'https://portfolio.example.com/request-a-project',
          startedAt: '2026-06-15T11:55:00.000Z',
          consent: true,
        },
      },
      visitor,
    );
    await leads.markSpam(first.lead.id, administrator);

    expect(await leads.listLeads({ type: 'project' })).toHaveLength(1);
    expect(await leads.listLeads({ search: 'compiler' })).toHaveLength(1);
    expect(await leads.listLeads({ status: 'spam' })).toHaveLength(1);
    expect(await leads.exportCsv({ type: 'project' })).toContain('grace@example.com');
  });
});

describe('lead HTTP acceptance', () => {
  const apps: FastifyInstance[] = [];
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

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('accepts public requests without authentication and exposes protected admin workflows', async () => {
    const dependencies = createApplicationDependencies(config, {
      clock,
      ids: sequentialIds(),
      ...administratorIdentityOverrides(),
    });
    const app = await buildApp(config, dependencies);
    apps.push(app);

    const created = await app.inject({ method: 'POST', url: '/api/public/contact', payload: contact() });
    expect(created.statusCode).toBe(201);
    const leadId = created.json().leadId as string;

    const duplicate = await app.inject({ method: 'POST', url: '/api/public/contact', payload: contact() });
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json().created).toBe(false);

    const listed = await app.inject({
      method: 'GET',
      url: '/api/admin/leads',
      headers: administratorHeaders,
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toHaveLength(1);

    const note = await app.inject({
      method: 'POST',
      url: `/api/admin/leads/${leadId}/notes`,
      headers: administratorHeaders,
      payload: { body: 'Follow up tomorrow.' },
    });
    expect(note.statusCode).toBe(201);
  });

  it('returns the stable validation contract for malformed public input', async () => {
    const dependencies = createApplicationDependencies(config);
    const app = await buildApp(config, dependencies);
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/public/contact',
      payload: { name: 'A' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('VALIDATION_ERROR');
    expect(response.json().correlationId).toBeTruthy();
    expect(response.json().fieldErrors).toBeDefined();
  });
});
