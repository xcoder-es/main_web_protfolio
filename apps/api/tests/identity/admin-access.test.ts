import { describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { createApplicationDependencies } from '../../src/composition.js';
import type { ApiRuntimeConfig } from '../../src/infrastructure/config.js';
import {
  administratorHeaders,
  administratorIdentityOverrides,
  administratorPrincipal,
  TestIdentityVerifier,
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

const contact = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Identity acceptance',
  message: 'Please validate the administrator authentication and authorization boundary.',
  metadata: {
    idempotencyKey: 'identity-acceptance-contact-0001',
    language: 'en',
    pageUrl: 'https://portfolio.example.com/contact',
    startedAt: '2026-06-15T11:58:00.000Z',
    consent: true,
  },
};

describe('administrator access control', () => {
  it('keeps public routes accessible while identity is not configured', async () => {
    const app = await buildApp(config, createApplicationDependencies(config));

    const publicResponse = await app.inject({ method: 'GET', url: '/api/public/status' });
    const administratorResponse = await app.inject({ method: 'GET', url: '/api/admin/status' });

    expect(publicResponse.statusCode).toBe(200);
    expect(administratorResponse.statusCode).toBe(503);
    expect(administratorResponse.json().code).toBe('IDENTITY_CONFIGURATION_ERROR');
    await app.close();
  });

  it('rejects missing, invalid and non-allowlisted identities', async () => {
    const app = await buildApp(
      config,
      createApplicationDependencies(config, administratorIdentityOverrides()),
    );

    const missing = await app.inject({ method: 'GET', url: '/api/admin/status' });
    const invalid = await app.inject({
      method: 'GET',
      url: '/api/admin/status',
      headers: { authorization: 'Bearer invalid-token' },
    });
    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/admin/status',
      headers: { authorization: 'Bearer valid-other-token' },
    });

    expect(missing.statusCode).toBe(401);
    expect(missing.json().code).toBe('AUTHENTICATION_REQUIRED');
    expect(invalid.statusCode).toBe(401);
    expect(invalid.json().code).toBe('AUTHENTICATION_REQUIRED');
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json().code).toBe('ADMIN_ACCESS_FORBIDDEN');
    await app.close();
  });

  it('allows configured user IDs and email addresses', async () => {
    const userIdApp = await buildApp(
      config,
      createApplicationDependencies(config, administratorIdentityOverrides()),
    );
    const userIdResponse = await userIdApp.inject({
      method: 'GET',
      url: '/api/admin/status',
      headers: administratorHeaders,
    });

    const emailApp = await buildApp(
      config,
      createApplicationDependencies(config, {
        identityVerifier: new TestIdentityVerifier(),
        administratorEmails: ['ADMIN@EXAMPLE.COM'],
      }),
    );
    const emailResponse = await emailApp.inject({
      method: 'GET',
      url: '/api/admin/status',
      headers: administratorHeaders,
    });

    expect(userIdResponse.statusCode).toBe(200);
    expect(userIdResponse.json()).toMatchObject({
      authentication: 'verified',
      userId: administratorPrincipal.userId,
    });
    expect(emailResponse.statusCode).toBe(200);
    await Promise.all([userIdApp.close(), emailApp.close()]);
  });

  it('uses the verified principal for administrator audit events', async () => {
    const app = await buildApp(
      config,
      createApplicationDependencies(config, administratorIdentityOverrides()),
    );
    const submitted = await app.inject({
      method: 'POST',
      url: '/api/public/contact',
      payload: contact,
    });
    const leadId = submitted.json().leadId as string;

    const note = await app.inject({
      method: 'POST',
      url: `/api/admin/leads/${leadId}/notes`,
      headers: administratorHeaders,
      payload: { body: 'Verified administrator note.' },
    });
    const details = await app.inject({
      method: 'GET',
      url: `/api/admin/leads/${leadId}`,
      headers: administratorHeaders,
    });
    const noteAudit = details
      .json()
      .audit.find((event: { action: string }) => event.action === 'lead.note_added');

    expect(note.statusCode).toBe(201);
    expect(noteAudit.actorId).toBe(administratorPrincipal.userId);
    await app.close();
  });
});
