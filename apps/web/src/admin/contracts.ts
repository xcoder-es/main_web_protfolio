export type LeadStatus =
  | 'new'
  | 'reviewing'
  | 'qualified'
  | 'contacted'
  | 'won'
  | 'lost'
  | 'archived'
  | 'spam';

export type LeadRecord = Readonly<{
  id: string;
  leadType: 'contact' | 'project';
  status: LeadStatus;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  company?: string;
  projectType?: string;
  message: string;
  budgetRange?: string;
  timeline?: string;
  language: 'en' | 'es';
  pageUrl: string;
  submittedAt: string;
  updatedAt: string;
}>;

export type LeadNote = Readonly<{
  id: string;
  leadId: string;
  body: string;
  authorPrincipalId: string;
  createdAt: string;
}>;

export type AuditEvent = Readonly<{
  id: string;
  actorType: 'visitor' | 'administrator' | 'system' | 'provider';
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  correlationId: string;
  metadata: Readonly<Record<string, unknown>>;
  createdAt: string;
}>;

export type LeadDetails = Readonly<{
  lead: LeadRecord;
  notes: readonly LeadNote[];
  audit: readonly AuditEvent[];
}>;

export type NotificationRecord = Readonly<{
  id: string;
  leadId?: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';
  recipient: string;
  templateKey: string;
  providerMessageId?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  scheduledAt: string;
  sentAt?: string;
  updatedAt: string;
}>;

export type NotificationAttempt = Readonly<{
  id: string;
  attemptNumber: number;
  status: 'sending' | 'sent' | 'failed' | 'skipped';
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  startedAt: string;
  finishedAt?: string;
}>;

export type NotificationDetails = Readonly<{
  notification: NotificationRecord;
  attempts: readonly NotificationAttempt[];
}>;

export type PaymentStatus =
  | 'draft'
  | 'active'
  | 'processing'
  | 'paid'
  | 'cancelled'
  | 'expired'
  | 'failed'
  | 'refunded';

export type PaymentRequest = Readonly<{
  id: string;
  leadId?: string;
  publicToken: string;
  title: string;
  description?: string;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  provider?: 'paypal';
  providerOrderId?: string;
  expiresAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}>;

export type PaymentEvent = Readonly<{
  id: string;
  paymentRequestId: string;
  provider: 'paypal' | 'internal';
  eventType: string;
  providerEventId?: string;
  payload: Readonly<Record<string, unknown>>;
  occurredAt: string;
}>;

export type DiagnosticCheck = Readonly<{
  name: string;
  state: 'ready' | 'disabled' | 'unavailable';
  required: boolean;
  latencyMs: number;
  checkedAt: string;
}>;

export type RetentionRule = Readonly<{
  domain:
    | 'leads'
    | 'spamLeads'
    | 'leadNotes'
    | 'notifications'
    | 'paymentRecords'
    | 'webhookSummaries'
    | 'auditEvents'
    | 'operationalLogs';
  days: number;
  trigger: string;
  minimumData: string;
  enforcement: 'manual-review';
}>;

export type Diagnostics = Readonly<{
  ready: boolean;
  generatedAt: string;
  durationMs: number;
  checks: readonly DiagnosticCheck[];
  release: Readonly<{
    service: string;
    version: string;
    environment: 'development' | 'test' | 'production';
    commitSha?: string;
    deploymentId?: string;
  }>;
  controls: Readonly<{
    requestLogging: 'metadata-only';
    publicErrors: 'sanitized';
    openApi: 'enabled' | 'disabled';
    webhookStorage: 'summary-only';
    credentials: 'runtime-only';
  }>;
  retention: readonly RetentionRule[];
}>;

export type ApiErrorPayload = Readonly<{
  code?: string;
  message?: string;
  correlationId?: string;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
}>;
