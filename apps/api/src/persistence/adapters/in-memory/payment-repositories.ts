import type {
  AuditEventRecord,
  PaymentEventRecord,
  PaymentRequestRecord,
  PaypalWebhookEventRecord,
} from '../../application/records.js';
import type {
  AuditEventRepository,
  PaymentEventRepository,
  PaymentRequestRepository,
  PaypalWebhookEventRepository,
} from '../../application/ports.js';
import { InMemoryRepository } from './base-repository.js';

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

  public async findByProviderOrderId(
    providerOrderId: string,
  ): Promise<PaymentRequestRecord | null> {
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

  public async listByPaymentRequestId(
    paymentRequestId: string,
  ): Promise<readonly PaymentEventRecord[]> {
    const records = await this.filter((record) => record.paymentRequestId === paymentRequestId);
    return [...records].sort(
      (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
    );
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

  public async findByProviderEventId(
    providerEventId: string,
  ): Promise<PaypalWebhookEventRecord | null> {
    return this.find((record) => record.providerEventId === providerEventId);
  }
}

export class InMemoryAuditEventRepository
  extends InMemoryRepository<AuditEventRecord>
  implements AuditEventRepository
{
  public async listByEntity(
    entityType: string,
    entityId: string,
  ): Promise<readonly AuditEventRecord[]> {
    return this.filter(
      (record) => record.entityType === entityType && record.entityId === entityId,
    );
  }

  public async listByCorrelationId(correlationId: string): Promise<readonly AuditEventRecord[]> {
    return this.filter((record) => record.correlationId === correlationId);
  }
}
