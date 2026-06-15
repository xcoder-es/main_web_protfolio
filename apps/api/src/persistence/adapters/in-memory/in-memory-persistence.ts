import type {
  AuditEventRecord,
  LeadNoteRecord,
  LeadRecord,
  NotificationAttemptRecord,
  NotificationRecord,
  PaymentEventRecord,
  PaymentRequestRecord,
  PaypalWebhookEventRecord,
} from '../../application/records.js';
import type {
  AuditEventRepository,
  LeadNoteRepository,
  LeadRepository,
  NotificationAttemptRepository,
  NotificationRepository,
  PaymentEventRepository,
  PaymentRequestRepository,
  PaypalWebhookEventRepository,
  PersistenceRepositories,
  Repository,
  UnitOfWork,
} from '../../application/ports.js';

function clone<T>(value: T): T {
  return structuredClone(value);
}

class InMemoryRepository<T extends { id: string }> implements Repository<T> {
  protected rows = new Map<string, T>();

  public async insert(record: T): Promise<void> {
    if (this.rows.has(record.id)) throw new Error(`Duplicate record id: ${record.id}`);
    this.rows.set(record.id, clone(record));
  }

  public async update(record: T): Promise<void> {
    if (!this.rows.has(record.id)) throw new Error(`Record not found: ${record.id}`);
    this.rows.set(record.id, clone(record));
  }

  public async getById(id: string): Promise<T | null> {
    const record = this.rows.get(id);
    return record ? clone(record) : null;
  }

  public async list(): Promise<readonly T[]> {
    return [...this.rows.values()].map(clone);
  }

  public snapshot(): Map<string, T> {
    return new Map([...this.rows.entries()].map(([id, record]) => [id, clone(record)]));
  }

  public restore(snapshot: Map<string, T>): void {
    this.rows = new Map([...snapshot.entries()].map(([id, record]) => [id, clone(record)]));
  }

  protected async find(predicate: (record: T) => boolean): Promise<T | null> {
    const record = [...this.rows.values()].find(predicate);
    return record ? clone(record) : null;
  }

  protected async filter(predicate: (record: T) => boolean): Promise<readonly T[]> {
    return [...this.rows.values()].filter(predicate).map(clone);
  }
}

export class InMemoryLeadRepository extends InMemoryRepository<LeadRecord> implements LeadRepository {
  public override async insert(record: LeadRecord): Promise<void> {
    if (await this.findByIdempotencyKey(record.idempotencyKey)) {
      throw new Error(`Duplicate lead idempotency key: ${record.idempotencyKey}`);
    }
    await super.insert(record);
  }

  public async findByIdempotencyKey(idempotencyKey: string): Promise<LeadRecord | null> {
    return this.find((record) => record.idempotencyKey === idempotencyKey);
  }
}

export class InMemoryLeadNoteRepository
  extends InMemoryRepository<LeadNoteRecord>
  implements LeadNoteRepository
{
  public async listByLeadId(leadId: string): Promise<readonly LeadNoteRecord[]> {
    return this.filter((record) => record.leadId === leadId);
  }
}

export class InMemoryNotificationRepository
  extends InMemoryRepository<NotificationRecord>
  implements NotificationRepository
{
  public override async insert(record: NotificationRecord): Promise<void> {
    if (await this.findByDeduplicationKey(record.deduplicationKey)) {
      throw new Error(`Duplicate notification key: ${record.deduplicationKey}`);
    }
    await super.insert(record);
  }

  public async findByDeduplicationKey(deduplicationKey: string): Promise<NotificationRecord | null> {
    return this.find((record) => record.deduplicationKey === deduplicationKey);
  }

  public async listPending(): Promise<readonly NotificationRecord[]> {
    const records = await this.filter((record) => record.status === 'pending');
    return [...records].sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime());
  }
}

export class InMemoryNotificationAttemptRepository
  extends InMemoryRepository<NotificationAttemptRecord>
  implements NotificationAttemptRepository
{
  public override async insert(record: NotificationAttemptRecord): Promise<void> {
    const attempts = await this.listByNotificationId(record.notificationId);
    if (attempts.some((attempt) => attempt.attemptNumber === record.attemptNumber)) {
      throw new Error(`Duplicate notification attempt: ${record.notificationId}/${record.attemptNumber}`);
    }
    await super.insert(record);
  }

  public async listByNotificationId(notificationId: string): Promise<readonly NotificationAttemptRecord[]> {
    const records = await this.filter((record) => record.notificationId === notificationId);
    return [...records].sort((left, right) => left.attemptNumber - right.attemptNumber);
  }
}

export class InMemoryPaymentRequestRepository
  extends InMemoryRepository<PaymentRequestRecord>
  implements PaymentRequestRepository
{
  public override async insert(record: PaymentRequestRecord): Promise<void> {
    if (await this.findByPublicToken(record.publicToken)) {
      throw new Error(`Duplicate payment public token: ${record.publicToken}`);
    }
    if (record.providerOrderId && (await this.findByProviderOrderId(record.providerOrderId))) {
      throw new Error(`Duplicate provider order id: ${record.providerOrderId}`);
    }
    await super.insert(record);
  }

  public async findByPublicToken(publicToken: string): Promise<PaymentRequestRecord | null> {
    return this.find((record) => record.publicToken === publicToken);
  }

  public async findByProviderOrderId(providerOrderId: string): Promise<PaymentRequestRecord | null> {
    return this.find((record) => record.providerOrderId === providerOrderId);
  }
}

export class InMemoryPaymentEventRepository
  extends InMemoryRepository<PaymentEventRecord>
  implements PaymentEventRepository
{
  public override async insert(record: PaymentEventRecord): Promise<void> {
    if (
      record.providerEventId &&
      (await this.findByProviderEventId(record.provider, record.providerEventId))
    ) {
      throw new Error(`Duplicate payment event: ${record.provider}/${record.providerEventId}`);
    }
    await super.insert(record);
  }

  public async findByProviderEventId(
    provider: string,
    providerEventId: string,
  ): Promise<PaymentEventRecord | null> {
    return this.find(
      (record) => record.provider === provider && record.providerEventId === providerEventId,
    );
  }

  public async listByPaymentRequestId(paymentRequestId: string): Promise<readonly PaymentEventRecord[]> {
    const records = await this.filter((record) => record.paymentRequestId === paymentRequestId);
    return [...records].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  }
}

export class InMemoryPaypalWebhookEventRepository
  extends InMemoryRepository<PaypalWebhookEventRecord>
  implements PaypalWebhookEventRepository
{
  public override async insert(record: PaypalWebhookEventRecord): Promise<void> {
    if (await this.findByProviderEventId(record.providerEventId)) {
      throw new Error(`Duplicate PayPal webhook event: ${record.providerEventId}`);
    }
    await super.insert(record);
  }

  public async findByProviderEventId(providerEventId: string): Promise<PaypalWebhookEventRecord | null> {
    return this.find((record) => record.providerEventId === providerEventId);
  }
}

export class InMemoryAuditEventRepository
  extends InMemoryRepository<AuditEventRecord>
  implements AuditEventRepository
{
  public async listByEntity(entityType: string, entityId: string): Promise<readonly AuditEventRecord[]> {
    return this.filter((record) => record.entityType === entityType && record.entityId === entityId);
  }

  public async listByCorrelationId(correlationId: string): Promise<readonly AuditEventRecord[]> {
    return this.filter((record) => record.correlationId === correlationId);
  }
}

export class InMemoryPersistence implements UnitOfWork {
  public readonly leads = new InMemoryLeadRepository();
  public readonly leadNotes = new InMemoryLeadNoteRepository();
  public readonly notifications = new InMemoryNotificationRepository();
  public readonly notificationAttempts = new InMemoryNotificationAttemptRepository();
  public readonly paymentRequests = new InMemoryPaymentRequestRepository();
  public readonly paymentEvents = new InMemoryPaymentEventRepository();
  public readonly paypalWebhookEvents = new InMemoryPaypalWebhookEventRepository();
  public readonly auditEvents = new InMemoryAuditEventRepository();

  public readonly repositories: PersistenceRepositories = {
    leads: this.leads,
    leadNotes: this.leadNotes,
    notifications: this.notifications,
    notificationAttempts: this.notificationAttempts,
    paymentRequests: this.paymentRequests,
    paymentEvents: this.paymentEvents,
    paypalWebhookEvents: this.paypalWebhookEvents,
    auditEvents: this.auditEvents,
  };

  private readonly transactionalRepositories = [
    this.leads,
    this.leadNotes,
    this.notifications,
    this.notificationAttempts,
    this.paymentRequests,
    this.paymentEvents,
    this.paypalWebhookEvents,
    this.auditEvents,
  ];

  public async execute<T>(work: () => Promise<T>): Promise<T> {
    const snapshots = this.transactionalRepositories.map((repository) => repository.snapshot());
    try {
      return await work();
    } catch (error) {
      this.transactionalRepositories.forEach((repository, index) => {
        const snapshot = snapshots[index];
        if (snapshot) repository.restore(snapshot);
      });
      throw error;
    }
  }
}
