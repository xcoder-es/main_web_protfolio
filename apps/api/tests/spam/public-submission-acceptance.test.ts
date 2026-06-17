import type { Clock } from '@carlos-pinto/contracts';
import { describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { createApplicationDependencies } from '../../src/composition.js';
import type { ApiRuntimeConfig } from '../../src/infrastructure/config.js';
import {
  NotificationSenderError,
  type NotificationMessage,
  type NotificationSender,
} from '../../src/notifications/application/ports.js';
import { InMemoryPersistence } from '../../src/persistence/adapters/in-memory/in-memory-persistence.js';
import { FakeSpamVerifier } from './fake-spam-verifier.js';

const clock: Clock = { now: () => new Date('2026-06-17T12:00:00.000Z') };
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
    spamVerification: true,
  },
};

class SuccessfulSender implements NotificationSender {
  public async send(_message: NotificationMessage) {
    return { providerMessageId: 'message-123' };
  }
}

class FailingSender implements NotificationSender {
  public async send(_message: NotificationMessage): Promise<never> {
    throw new NotificationSenderError('RESEND_UNAVAILABLE', 'Resend unavailable.', true);
  }
}

function contact(idempotencyKey = '00000000-0000-4000-8000-000000000001') {
  return {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+34 600 000 000',
    subject: 'Architecture advisory',
    message: 'We need a clear architecture direction for a complex modernisation initiative.',
    metadata: {
      idempotencyKey,
      language: 'en',
      pageUrl: 'https://portfolio.example.com/contact',
      startedAt: '2026-06-17T11:58:00.000Z',
      consent: true,
    },
    antiSpam: { website: '', turnstileToken: 'valid-contact-token' },
  };
}

function project() {
  return {
    name: 'Grace Hopper',
    email: 'grace@example.com',
    company: 'Compiler Labs',
    projectType: 'ai-engineering',
    summary:
      'We need to design and deliver a governed AI product with strong evaluation and operational controls.',
    budgetRange: '15k-50k',
    timeline: 'one-to-three-months',
    metadata: {
      idempotencyKey: '00000000-0000-4000-8000-000000000002',
      language: 'en',
      pageUrl: 'https://portfolio.example.com/request-a-project',
      startedAt: '2026-06-17T11:57:00.000Z',
      consent: true,
    },
    antiSpam: { website: '', turnstileToken: 'valid-project-token' },
  };
}

function harness(sender: NotificationSender = new SuccessfulSender()) {
  const persistence = new InMemoryPersistence();
  const spamVerifier = new FakeSpamVerifier();
  const dependencies = createApplicationDependencies(config, {
    persistence: { repositories: persistence.repositories, unitOfWork: persistence },
    clock,
    notificationSender: sender,
    spamVerifier,
  });
  return { persistence, spamVerifier, dependencies };
}

describe('protected public submission acceptance', () => {
  it('persists a valid contact exactly once and skips repeated challenge verification', async () => {
    const { persistence, spamVerifier, dependencies } = harness();
    const app = await buildApp(config, dependencies);

    const first = await app.inject({
      method: 'POST',
      url: '/api/public/contact',
      payload: contact(),
    });
    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/public/contact',
      payload: contact(),
    });

    expect(first.statusCode).toBe(201);
    expect(first.json()).toMatchObject({ created: true, status: 'new' });
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json()).toMatchObject({ created: false, leadId: first.json().leadId });
    expect(await persistence.leads.list()).toHaveLength(1);
    expect(spamVerifier.calls).toHaveLength(1);
    await app.close();
  });

  it('persists a valid project request with the expected challenge action', async () => {
    const { persistence, spamVerifier, dependencies } = harness();
    const app = await buildApp(config, dependencies);

    const response = await app.inject({
      method: 'POST',
      url: '/api/public/project-requests',
      payload: project(),
    });

    expect(response.statusCode).toBe(201);
    expect((await persistence.leads.list())[0]).toMatchObject({
      leadType: 'project',
      projectType: 'ai-engineering',
      budgetRange: '15k-50k',
    });
    expect(spamVerifier.calls[0]).toMatchObject({
      action: 'project-request',
      token: 'valid-project-token',
    });
    await app.close();
  });

  it('rejects honeypots and implausibly fast submissions before provider calls', async () => {
    const honeypotHarness = harness();
    const honeypotApp = await buildApp(config, honeypotHarness.dependencies);
    const trapped = await honeypotApp.inject({
      method: 'POST',
      url: '/api/public/contact',
      payload: {
        ...contact(),
        antiSpam: { website: 'https://spam.example', turnstileToken: 'token' },
      },
    });
    expect(trapped.statusCode).toBe(400);
    expect(trapped.json().code).toBe('SUBMISSION_REJECTED');
    expect(await honeypotHarness.persistence.leads.list()).toHaveLength(0);
    expect(honeypotHarness.spamVerifier.calls).toHaveLength(0);
    await honeypotApp.close();

    const timingHarness = harness();
    const timingApp = await buildApp(config, timingHarness.dependencies);
    const tooFast = await timingApp.inject({
      method: 'POST',
      url: '/api/public/contact',
      payload: {
        ...contact(),
        metadata: { ...contact().metadata, startedAt: '2026-06-17T11:59:59.500Z' },
      },
    });
    expect(tooFast.statusCode).toBe(400);
    expect(tooFast.json().code).toBe('SUBMISSION_REJECTED');
    expect(timingHarness.spamVerifier.calls).toHaveLength(0);
    await timingApp.close();
  });

  it('rejects failed challenges and reports unavailable providers without saving leads', async () => {
    const rejectedHarness = harness();
    rejectedHarness.spamVerifier.result = {
      status: 'rejected',
      errorCodes: ['invalid-input-response'],
    };
    const rejectedApp = await buildApp(config, rejectedHarness.dependencies);
    const rejected = await rejectedApp.inject({
      method: 'POST',
      url: '/api/public/contact',
      payload: contact(),
    });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json().code).toBe('SPAM_VERIFICATION_FAILED');
    expect(await rejectedHarness.persistence.leads.list()).toHaveLength(0);
    await rejectedApp.close();

    const unavailableHarness = harness();
    unavailableHarness.spamVerifier.result = { status: 'unavailable' };
    const unavailableApp = await buildApp(config, unavailableHarness.dependencies);
    const unavailable = await unavailableApp.inject({
      method: 'POST',
      url: '/api/public/contact',
      payload: contact(),
    });
    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.json().code).toBe('SPAM_VERIFICATION_UNAVAILABLE');
    expect(await unavailableHarness.persistence.leads.list()).toHaveLength(0);
    await unavailableApp.close();
  });

  it('keeps a persisted lead successful when notification delivery fails', async () => {
    const { persistence, dependencies } = harness(new FailingSender());
    const app = await buildApp(config, dependencies);

    const response = await app.inject({
      method: 'POST',
      url: '/api/public/contact',
      payload: contact(),
    });

    expect(response.statusCode).toBe(201);
    expect(await persistence.leads.list()).toHaveLength(1);
    expect(await persistence.notifications.list()).toHaveLength(1);
    expect((await persistence.notifications.list())[0]?.status).toBe('failed');
    await app.close();
  });

  it('applies the contact route rate limit independently of the global limit', async () => {
    const { dependencies } = harness();
    const app = await buildApp(config, dependencies);

    for (let index = 0; index < 5; index += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/public/contact',
        payload: contact(`00000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`),
      });
      expect(response.statusCode).toBe(201);
    }
    const limited = await app.inject({
      method: 'POST',
      url: '/api/public/contact',
      payload: contact('00000000-0000-4000-8000-000000000099'),
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.json().code).toBe('RATE_LIMIT_EXCEEDED');
    await app.close();
  });
});
