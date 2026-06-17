export type LeadRecord = {
  id: string;
  leadType: 'contact' | 'project';
  status: 'new' | 'reviewing' | 'qualified' | 'contacted' | 'won' | 'lost' | 'archived' | 'spam';
  idempotencyKey: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  company?: string;
  projectType?: string;
  message: string;
  desiredOutcome?: string;
  budgetRange?: string;
  timeline?: string;
  language: 'en' | 'es';
  pageUrl: string;
  consentedAt: Date;
  submittedAt: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type LeadNoteRecord = {
  id: string;
  leadId: string;
  body: string;
  authorPrincipalId: string;
  createdAt: Date;
};

export type NotificationRecord = {
  id: string;
  leadId?: string;
  channel: 'email';
  templateKey: string;
  recipient: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';
  deduplicationKey: string;
  providerMessageId?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  scheduledAt: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationAttemptRecord = {
  id: string;
  notificationId: string;
  attemptNumber: number;
  status: 'sending' | 'sent' | 'failed' | 'skipped';
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  startedAt: Date;
  finishedAt?: Date;
  createdAt: Date;
};

export type PaymentRequestRecord = {
  id: string;
  leadId?: string;
  publicToken: string;
  title: string;
  description?: string;
  amountMinor: number;
  currency: string;
  status:
    | 'draft'
    | 'active'
    | 'processing'
    | 'paid'
    | 'cancelled'
    | 'expired'
    | 'failed'
    | 'refunded';
  provider?: 'paypal';
  providerOrderId?: string;
  expiresAt?: Date;
  paidAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentEventRecord = {
  id: string;
  paymentRequestId: string;
  provider: 'paypal' | 'internal';
  eventType: string;
  providerEventId?: string;
  payload: Readonly<Record<string, unknown>>;
  occurredAt: Date;
  createdAt: Date;
};

export type PaypalWebhookEventRecord = {
  id: string;
  providerEventId: string;
  eventType: string;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'failed';
  payload: Readonly<Record<string, unknown>>;
  receivedAt: Date;
  processedAt?: Date;
  processingError?: string;
};

export type AuditEventRecord = {
  id: string;
  actorType: 'visitor' | 'administrator' | 'system' | 'provider';
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  correlationId: string;
  metadata: Readonly<Record<string, unknown>>;
  createdAt: Date;
};

export type PersistenceRecord =
  | LeadRecord
  | LeadNoteRecord
  | NotificationRecord
  | NotificationAttemptRecord
  | PaymentRequestRecord
  | PaymentEventRecord
  | PaypalWebhookEventRecord
  | AuditEventRecord;
