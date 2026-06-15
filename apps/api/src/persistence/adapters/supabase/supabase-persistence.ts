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
import type {
  DatabaseFilter,
  DatabaseOrder,
  SupabaseGateway,
  TransactionRunner,
} from './gateway.js';
import { fromDatabaseRow, toDatabaseRow } from './row-mapper.js';

class SupabaseRepository<T extends { id: string }> implements Repository<T> {
  public constructor(
    protected readonly gateway: SupabaseGateway,
    protected readonly table: string,
  ) {}

  public async insert(record: T): Promise<void> {
    await this.gateway.insert(this.table, toDatabaseRow(record));
  }

  public async update(record: T): Promise<void> {
    await this.gateway.update(this.table, record.id, toDatabaseRow(record));
  }

  public async getById(id: string): Promise<T | null> {
    return this.findOne([{ column: 'id', value: id }]);
  }

  public async list(): Promise<readonly T[]> {
    return this.findMany();
  }

  protected async findOne(filters: readonly DatabaseFilter[]): Promise<T | null> {
    const row = await this.gateway.selectOne(this.table, filters);
    return row ? fromDatabaseRow<T>(row) : null;
  }

  protected async findMany(
    filters?: readonly DatabaseFilter[],
    order?: readonly DatabaseOrder[],
  ): Promise<readonly T[]> {
    const rows = await this.gateway.selectMany(this.table, filters, order);
    return rows.map((row) => fromDatabaseRow<T>(row));
  }
}

export class SupabaseLeadRepository extends SupabaseRepository<LeadRecord> implements LeadRepository {
  public constructor(gateway: SupabaseGateway) {
    super(gateway, 'leads');
  }

  public async findByIdempotencyKey(idempotencyKey: string): Promise<LeadRecord | null> {
    return this.findOne([{ column: 'idempotency_key', value: idempotencyKey }]);
  }
}

export class SupabaseLeadNoteRepository
  extends SupabaseRepository<LeadNoteRecord>
  implements LeadNoteRepository
{
  public constructor(gateway: SupabaseGateway) {
    super(gateway, 'lead_notes');
  }

  public async listByLeadId(leadId: string): Promise<readonly LeadNoteRecord[]> {
    return this.findMany(
      [{ column: 'lead_id', value: leadId }],
      [{ column: 'created_at', ascending: true }],
    );
  }
}

export class SupabaseNotificationRepository
  extends SupabaseRepository<NotificationRecord>
  implements NotificationRepository
{
  public constructor(gateway: SupabaseGateway) {
    super(gateway, 'notifications');
  }

  public async findByDeduplicationKey(deduplicationKey: string): Promise<NotificationRecord | null> {
    return this.findOne([{ column: 'deduplication_key', value: deduplicationKey }]);
  }

  public async listPending(): Promise<readonly NotificationRecord[]> {
    return this.findMany(
      [{ column: 'status', value: 'pending' }],
      [{ column: 'scheduled_at', ascending: true }],
    );
  }
}

export class SupabaseNotificationAttemptRepository
  extends SupabaseRepository<NotificationAttemptRecord>
  implements NotificationAttemptRepository
{
  public constructor(gateway: SupabaseGateway) {
    super(gateway, 'notification_attempts');
  }

  public async listByNotificationId(
    notificationId: string,
  ): Promise<readonly NotificationAttemptRecord[]> {
    return this.findMany(
      [{ column: 'notification_id', value: notificationId }],
      [{ column: 'attempt_number', ascending: true }],
    );
  }
}

export class SupabasePaymentRequestRepository
  extends SupabaseRepository<PaymentRequestRecord>
  implements PaymentRequestRepository
{
  public constructor(gateway: SupabaseGateway) {
    super(gateway, 'payment_requests');
  }

  public async findByPublicToken(publicToken: string): Promise<PaymentRequestRecord | null> {
    return this.findOne([{ column: 'public_token', value: publicToken }]);
  }

  public async findByProviderOrderId(providerOrderId: string): Promise<PaymentRequestRecord | null> {
    return this.findOne([{ column: 'provider_order_id', value: providerOrderId }]);
  }
}

export class SupabasePaymentEventRepository
  extends SupabaseRepository<PaymentEventRecord>
  implements PaymentEventRepository
{
  public constructor(gateway: SupabaseGateway) {
    super(gateway, 'payment_events');
  }

  public async findByProviderEventId(
    provider: string,
    providerEventId: string,
  ): Promise<PaymentEventRecord | null> {
    return this.findOne([
      { column: 'provider', value: provider },
      { column: 'provider_event_id', value: providerEventId },
    ]);
  }

  public async listByPaymentRequestId(paymentRequestId: string): Promise<readonly PaymentEventRecord[]> {
    return this.findMany(
      [{ column: 'payment_request_id', value: paymentRequestId }],
      [{ column: 'occurred_at', ascending: true }],
    );
  }
}

export class SupabasePaypalWebhookEventRepository
  extends SupabaseRepository<PaypalWebhookEventRecord>
  implements PaypalWebhookEventRepository
{
  public constructor(gateway: SupabaseGateway) {
    super(gateway, 'paypal_webhook_events');
  }

  public async findByProviderEventId(providerEventId: string): Promise<PaypalWebhookEventRecord | null> {
    return this.findOne([{ column: 'provider_event_id', value: providerEventId }]);
  }
}

export class SupabaseAuditEventRepository
  extends SupabaseRepository<AuditEventRecord>
  implements AuditEventRepository
{
  public constructor(gateway: SupabaseGateway) {
    super(gateway, 'audit_events');
  }

  public async listByEntity(
    entityType: string,
    entityId: string,
  ): Promise<readonly AuditEventRecord[]> {
    return this.findMany(
      [
        { column: 'entity_type', value: entityType },
        { column: 'entity_id', value: entityId },
      ],
      [{ column: 'created_at', ascending: true }],
    );
  }

  public async listByCorrelationId(correlationId: string): Promise<readonly AuditEventRecord[]> {
    return this.findMany(
      [{ column: 'correlation_id', value: correlationId }],
      [{ column: 'created_at', ascending: true }],
    );
  }
}

export class SupabaseUnitOfWork implements UnitOfWork {
  public constructor(private readonly transactionRunner: TransactionRunner) {}

  public execute<T>(work: () => Promise<T>): Promise<T> {
    return this.transactionRunner.execute(work);
  }
}

export function createSupabasePersistence(
  gateway: SupabaseGateway,
  transactionRunner: TransactionRunner,
): { repositories: PersistenceRepositories; unitOfWork: UnitOfWork } {
  return {
    repositories: {
      leads: new SupabaseLeadRepository(gateway),
      leadNotes: new SupabaseLeadNoteRepository(gateway),
      notifications: new SupabaseNotificationRepository(gateway),
      notificationAttempts: new SupabaseNotificationAttemptRepository(gateway),
      paymentRequests: new SupabasePaymentRequestRepository(gateway),
      paymentEvents: new SupabasePaymentEventRepository(gateway),
      paypalWebhookEvents: new SupabasePaypalWebhookEventRepository(gateway),
      auditEvents: new SupabaseAuditEventRepository(gateway),
    },
    unitOfWork: new SupabaseUnitOfWork(transactionRunner),
  };
}
