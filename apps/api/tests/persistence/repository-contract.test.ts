import { describe, expect, it } from 'vitest';

import { InMemoryPersistence } from '../../src/persistence/adapters/in-memory/in-memory-persistence.js';
import { createSupabasePersistence } from '../../src/persistence/adapters/supabase/supabase-persistence.js';
import type {
  PersistenceRepositories,
  UnitOfWork,
} from '../../src/persistence/application/ports.js';
import { FakeSupabaseGateway, FakeTransactionRunner } from './fake-supabase-gateway.js';
import {
  auditEventFixture,
  leadFixture,
  leadNoteFixture,
  notificationAttemptFixture,
  notificationFixture,
} from './lead-fixtures.js';
import {
  paymentEventFixture,
  paymentRequestFixture,
  paypalWebhookFixture,
} from './payment-fixtures.js';

type Harness = {
  repositories: PersistenceRepositories;
  unitOfWork: UnitOfWork;
};

const factories: readonly [string, () => Harness][] = [
  [
    'in-memory adapters',
    () => {
      const persistence = new InMemoryPersistence();
      return { repositories: persistence.repositories, unitOfWork: persistence };
    },
  ],
  [
    'Supabase adapters',
    () => {
      const gateway = new FakeSupabaseGateway();
      return createSupabasePersistence(gateway, new FakeTransactionRunner(gateway));
    },
  ],
];

for (const [name, createHarness] of factories) {
  describe(name, () => {
    it('persists, retrieves and updates leads without leaking mutable references', async () => {
      const { repositories } = createHarness();
      const lead = leadFixture();

      await repositories.leads.insert(lead);
      const persisted = await repositories.leads.getById(lead.id);
      expect(persisted).toEqual(lead);
      expect(await repositories.leads.findByIdempotencyKey(lead.idempotencyKey)).toEqual(lead);

      lead.name = 'Mutated outside repository';
      expect((await repositories.leads.getById(lead.id))?.name).toBe('Carlos Pinto');

      const updated = leadFixture({ status: 'reviewing', updatedAt: new Date('2026-06-15T13:00:00Z') });
      await repositories.leads.update(updated);
      expect((await repositories.leads.getById(lead.id))?.status).toBe('reviewing');
      expect(await repositories.leads.list()).toHaveLength(1);
    });

    it('supports lead notes, notification queues and ordered delivery attempts', async () => {
      const { repositories } = createHarness();
      const note = leadNoteFixture();
      const notification = notificationFixture();
      const secondNotification = notificationFixture({
        id: '30000000-0000-4000-8000-000000000002',
        status: 'sent',
        deduplicationKey: 'notification-dedupe-0002',
        sentAt: new Date('2026-06-15T12:05:00Z'),
      });

      await repositories.leadNotes.insert(note);
      await repositories.notifications.insert(notification);
      await repositories.notifications.insert(secondNotification);
      await repositories.notificationAttempts.insert(notificationAttemptFixture());
      await repositories.notificationAttempts.insert(
        notificationAttemptFixture({
          id: '40000000-0000-4000-8000-000000000002',
          attemptNumber: 2,
          status: 'sent',
          finishedAt: new Date('2026-06-15T12:01:00Z'),
        }),
      );

      expect(await repositories.leadNotes.listByLeadId(note.leadId)).toEqual([note]);
      expect(
        await repositories.notifications.findByDeduplicationKey(notification.deduplicationKey),
      ).toEqual(notification);
      expect(await repositories.notifications.listPending()).toEqual([notification]);
      expect(
        (await repositories.notificationAttempts.listByNotificationId(notification.id)).map(
          (attempt) => attempt.attemptNumber,
        ),
      ).toEqual([1, 2]);
    });

    it('supports payment lookup, provider idempotency records and audit queries', async () => {
      const { repositories } = createHarness();
      const payment = paymentRequestFixture();
      const paymentEvent = paymentEventFixture();
      const webhook = paypalWebhookFixture();
      const audit = auditEventFixture();

      await repositories.paymentRequests.insert(payment);
      await repositories.paymentEvents.insert(paymentEvent);
      await repositories.paypalWebhookEvents.insert(webhook);
      await repositories.auditEvents.insert(audit);

      expect(await repositories.paymentRequests.findByPublicToken(payment.publicToken)).toEqual(payment);
      expect(
        await repositories.paymentRequests.findByProviderOrderId(payment.providerOrderId ?? ''),
      ).toEqual(payment);
      expect(
        await repositories.paymentEvents.findByProviderEventId(
          paymentEvent.provider,
          paymentEvent.providerEventId ?? '',
        ),
      ).toEqual(paymentEvent);
      expect(await repositories.paymentEvents.listByPaymentRequestId(payment.id)).toEqual([
        paymentEvent,
      ]);
      expect(
        await repositories.paypalWebhookEvents.findByProviderEventId(webhook.providerEventId),
      ).toEqual(webhook);
      expect(await repositories.auditEvents.listByEntity('lead', audit.entityId ?? '')).toEqual([
        audit,
      ]);
      expect(await repositories.auditEvents.listByCorrelationId(audit.correlationId)).toEqual([
        audit,
      ]);
    });

    it('rolls back writes when a unit of work fails', async () => {
      const { repositories, unitOfWork } = createHarness();
      const lead = leadFixture();

      await expect(
        unitOfWork.execute(async () => {
          await repositories.leads.insert(lead);
          throw new Error('simulated failure');
        }),
      ).rejects.toThrow('simulated failure');

      expect(await repositories.leads.getById(lead.id)).toBeNull();
    });
  });
}

describe('in-memory uniqueness behaviour', () => {
  it('rejects duplicate logical idempotency keys', async () => {
    const persistence = new InMemoryPersistence();
    await persistence.leads.insert(leadFixture());

    await expect(
      persistence.leads.insert(
        leadFixture({
          id: '10000000-0000-4000-8000-000000000002',
        }),
      ),
    ).rejects.toThrow('Duplicate lead idempotency key');
  });

  it('rejects duplicate PayPal webhook event identifiers', async () => {
    const persistence = new InMemoryPersistence();
    await persistence.paypalWebhookEvents.insert(paypalWebhookFixture());

    await expect(
      persistence.paypalWebhookEvents.insert(
        paypalWebhookFixture({
          id: '80000000-0000-4000-8000-000000000002',
        }),
      ),
    ).rejects.toThrow('Duplicate PayPal webhook event');
  });
});
