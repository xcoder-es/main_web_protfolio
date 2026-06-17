import type { Clock, ContactSubmission, IdGenerator } from '@carlos-pinto/contracts';
import { describe, expect, it } from 'vitest';

import { LeadsService } from '../../src/leads/application/service.js';
import {
  NotificationSenderError,
  type NotificationMessage,
  type NotificationSender,
  type NotificationSendResult,
} from '../../src/notifications/application/ports.js';
import { NotificationsService } from '../../src/notifications/application/service.js';
import { SubmissionNotificationCoordinator } from '../../src/notifications/application/submission-coordinator.js';
import { InMemoryPersistence } from '../../src/persistence/adapters/in-memory/in-memory-persistence.js';

const clock: Clock = { now: () => new Date('2026-06-15T12:00:00.000Z') };

function ids(): IdGenerator {
  let value = 1;
  return {
    generate: () => `00000000-0000-4000-8000-${String(value++).padStart(12, '0')}`,
  };
}

function contact(): ContactSubmission {
  return {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    subject: 'Architecture review',
    message: 'Please help review the architecture and delivery controls for this platform.',
    metadata: {
      idempotencyKey: 'browser-notification-0001',
      language: 'en',
      pageUrl: 'https://portfolio.example.com/contact',
      startedAt: '2026-06-15T11:58:00.000Z',
      consent: true,
    },
  };
}

class SequenceSender implements NotificationSender {
  public readonly messages: NotificationMessage[] = [];

  public constructor(private readonly outcomes: Array<'fail' | 'send'>) {}

  public async send(message: NotificationMessage): Promise<NotificationSendResult> {
    this.messages.push(message);
    const outcome = this.outcomes.shift() ?? 'send';
    if (outcome === 'fail') {
      throw new NotificationSenderError('RESEND_UNAVAILABLE', 'Resend could not be reached.', true);
    }
    return { providerMessageId: `provider-${this.messages.length}` };
  }
}

function harness(sender: NotificationSender) {
  const persistence = new InMemoryPersistence();
  const generator = ids();
  const leads = new LeadsService({
    leads: persistence.leads,
    notes: persistence.leadNotes,
    audit: persistence.auditEvents,
    unitOfWork: persistence,
    clock,
    ids: generator,
  });
  const notifications = new NotificationsService({
    notifications: persistence.notifications,
    attempts: persistence.notificationAttempts,
    leads: persistence.leads,
    unitOfWork: persistence,
    sender,
    clock,
    ids: generator,
    fromAddress: 'Carlos Pinto <notifications@example.com>',
    recipientAddress: 'carlos@example.com',
  });
  return {
    persistence,
    notifications,
    coordinator: new SubmissionNotificationCoordinator(leads, notifications),
  };
}

const visitor = { type: 'visitor' as const, correlationId: 'request-notification-0001' };

describe('durable notifications', () => {
  it('keeps the lead when delivery fails and prevents duplicate notifications', async () => {
    const sender = new SequenceSender(['fail']);
    const { persistence, coordinator } = harness(sender);

    const first = await coordinator.submitContact(contact(), visitor);
    const duplicate = await coordinator.submitContact(contact(), visitor);
    const notifications = await persistence.notifications.list();
    const attempts = await persistence.notificationAttempts.listByNotificationId(
      notifications[0]?.id ?? '',
    );

    expect(first.created).toBe(true);
    expect(duplicate.created).toBe(false);
    expect(await persistence.leads.list()).toHaveLength(1);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.status).toBe('failed');
    expect(notifications[0]?.lastErrorCode).toBe('RESEND_UNAVAILABLE');
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.status).toBe('failed');
    expect(sender.messages).toHaveLength(1);
  });

  it('retries a failed notification once and becomes idempotent after success', async () => {
    const sender = new SequenceSender(['fail', 'send']);
    const { persistence, notifications, coordinator } = harness(sender);

    await coordinator.submitContact(contact(), visitor);
    const notification = (await persistence.notifications.list())[0];
    expect(notification).toBeDefined();

    const retried = await notifications.retry(notification!.id);
    const duplicateRetry = await notifications.retry(notification!.id);
    const attempts = await persistence.notificationAttempts.listByNotificationId(notification!.id);

    expect(retried.status).toBe('sent');
    expect(duplicateRetry.status).toBe('sent');
    expect(retried.providerMessageId).toBe('provider-2');
    expect(attempts.map((attempt) => attempt.status)).toEqual(['failed', 'sent']);
    expect(sender.messages).toHaveLength(2);
    expect(sender.messages[0]?.idempotencyKey).toBe(sender.messages[1]?.idempotencyKey);
  });

  it('lists pending notifications and rejects unknown filters', async () => {
    const sender = new SequenceSender([]);
    const { persistence, notifications } = harness(sender);
    const now = clock.now();
    await persistence.notifications.insert({
      id: '10000000-0000-4000-8000-000000000001',
      channel: 'email',
      templateKey: 'lead-submitted',
      recipient: 'carlos@example.com',
      status: 'pending',
      deduplicationKey: 'pending-notification-0001',
      scheduledAt: now,
      createdAt: now,
      updatedAt: now,
    });

    expect(await notifications.listPending()).toHaveLength(1);
    await expect(notifications.list({ status: 'unknown' })).rejects.toMatchObject({
      code: 'INVALID_NOTIFICATION_FILTER',
      statusCode: 400,
    });
  });
});
