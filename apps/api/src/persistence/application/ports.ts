import type {
  AuditEventRecord,
  LeadNoteRecord,
  LeadRecord,
  NotificationAttemptRecord,
  NotificationRecord,
  PaymentEventRecord,
  PaymentRequestRecord,
  PaypalWebhookEventRecord,
} from './records.js';

export interface Repository<T extends { id: string }> {
  insert(record: T): Promise<void>;
  update(record: T): Promise<void>;
  getById(id: string): Promise<T | null>;
  list(): Promise<readonly T[]>;
}

export interface LeadRepository extends Repository<LeadRecord> {
  findByIdempotencyKey(idempotencyKey: string): Promise<LeadRecord | null>;
}

export interface LeadNoteRepository extends Repository<LeadNoteRecord> {
  listByLeadId(leadId: string): Promise<readonly LeadNoteRecord[]>;
}

export interface NotificationRepository extends Repository<NotificationRecord> {
  findByDeduplicationKey(deduplicationKey: string): Promise<NotificationRecord | null>;
  listPending(): Promise<readonly NotificationRecord[]>;
}

export interface NotificationAttemptRepository extends Repository<NotificationAttemptRecord> {
  listByNotificationId(notificationId: string): Promise<readonly NotificationAttemptRecord[]>;
}

export interface PaymentRequestRepository extends Repository<PaymentRequestRecord> {
  findByPublicToken(publicToken: string): Promise<PaymentRequestRecord | null>;
  findByProviderOrderId(providerOrderId: string): Promise<PaymentRequestRecord | null>;
}

export interface PaymentEventRepository extends Repository<PaymentEventRecord> {
  findByProviderEventId(
    provider: string,
    providerEventId: string,
  ): Promise<PaymentEventRecord | null>;
  listByPaymentRequestId(paymentRequestId: string): Promise<readonly PaymentEventRecord[]>;
}

export interface PaypalWebhookEventRepository extends Repository<PaypalWebhookEventRecord> {
  findByProviderEventId(providerEventId: string): Promise<PaypalWebhookEventRecord | null>;
}

export interface AuditEventRepository extends Repository<AuditEventRecord> {
  listByEntity(entityType: string, entityId: string): Promise<readonly AuditEventRecord[]>;
  listByCorrelationId(correlationId: string): Promise<readonly AuditEventRecord[]>;
}

export type PersistenceRepositories = {
  leads: LeadRepository;
  leadNotes: LeadNoteRepository;
  notifications: NotificationRepository;
  notificationAttempts: NotificationAttemptRepository;
  paymentRequests: PaymentRequestRepository;
  paymentEvents: PaymentEventRepository;
  paypalWebhookEvents: PaypalWebhookEventRepository;
  auditEvents: AuditEventRepository;
};

export interface UnitOfWork {
  execute<T>(work: () => Promise<T>): Promise<T>;
}
