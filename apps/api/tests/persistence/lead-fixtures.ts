import type {
  AuditEventRecord,
  LeadNoteRecord,
  LeadRecord,
  NotificationAttemptRecord,
  NotificationRecord,
} from '../../src/persistence/application/records.js';

const timestamp = new Date('2026-06-15T12:00:00.000Z');

export function leadFixture(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    leadType: 'contact',
    status: 'new',
    idempotencyKey: 'lead-idempotency-0001',
    name: 'Carlos Pinto',
    email: 'carlos@example.com',
    subject: 'Architecture advisory',
    message: 'I need help defining a production architecture for a digital consulting platform.',
    language: 'en',
    pageUrl: 'https://example.com/contact',
    consentedAt: timestamp,
    submittedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

export function leadNoteFixture(overrides: Partial<LeadNoteRecord> = {}): LeadNoteRecord {
  return {
    id: '20000000-0000-4000-8000-000000000001',
    leadId: '10000000-0000-4000-8000-000000000001',
    body: 'Follow up within one business day.',
    authorPrincipalId: 'admin-carlos',
    createdAt: timestamp,
    ...overrides,
  };
}

export function notificationFixture(
  overrides: Partial<NotificationRecord> = {},
): NotificationRecord {
  return {
    id: '30000000-0000-4000-8000-000000000001',
    leadId: '10000000-0000-4000-8000-000000000001',
    channel: 'email',
    templateKey: 'lead-created',
    recipient: 'carlos@example.com',
    status: 'pending',
    deduplicationKey: 'notification-dedupe-0001',
    scheduledAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

export function notificationAttemptFixture(
  overrides: Partial<NotificationAttemptRecord> = {},
): NotificationAttemptRecord {
  return {
    id: '40000000-0000-4000-8000-000000000001',
    notificationId: '30000000-0000-4000-8000-000000000001',
    attemptNumber: 1,
    status: 'sending',
    startedAt: timestamp,
    createdAt: timestamp,
    ...overrides,
  };
}

export function auditEventFixture(overrides: Partial<AuditEventRecord> = {}): AuditEventRecord {
  return {
    id: '90000000-0000-4000-8000-000000000001',
    actorType: 'administrator',
    actorId: 'admin-carlos',
    action: 'lead.status.changed',
    entityType: 'lead',
    entityId: '10000000-0000-4000-8000-000000000001',
    correlationId: 'correlation-0001',
    metadata: { previousStatus: 'new', nextStatus: 'reviewing' },
    createdAt: timestamp,
    ...overrides,
  };
}
