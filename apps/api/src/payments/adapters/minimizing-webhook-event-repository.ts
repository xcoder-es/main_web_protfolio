import type { PaypalWebhookEventRepository } from '../../persistence/application/ports.js';
import type { PaypalWebhookEventRecord } from '../../persistence/application/records.js';

export class MinimizingWebhookEventRepository implements PaypalWebhookEventRepository {
  public constructor(private readonly delegate: PaypalWebhookEventRepository) {}

  public insert(record: PaypalWebhookEventRecord): Promise<void> {
    return this.delegate.insert(minimize(record));
  }

  public update(record: PaypalWebhookEventRecord): Promise<void> {
    return this.delegate.update(minimize(record));
  }

  public getById(id: string): Promise<PaypalWebhookEventRecord | null> {
    return this.delegate.getById(id);
  }

  public list(): Promise<readonly PaypalWebhookEventRecord[]> {
    return this.delegate.list();
  }

  public findByProviderEventId(providerEventId: string): Promise<PaypalWebhookEventRecord | null> {
    return this.delegate.findByProviderEventId(providerEventId);
  }
}

export function minimizeWebhookPayload(
  payload: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const resource = objectValue(payload, 'resource');
  const amount = objectValue(resource, 'amount');
  const relatedIds = objectValue(objectValue(resource, 'supplementary_data'), 'related_ids');
  return {
    ...(stringValue(payload, 'id') ? { providerEventId: stringValue(payload, 'id') } : {}),
    ...(stringValue(payload, 'event_type')
      ? { eventType: stringValue(payload, 'event_type') }
      : {}),
    ...(stringValue(resource, 'id') ? { resourceId: stringValue(resource, 'id') } : {}),
    ...(stringValue(resource, 'status') ? { resourceStatus: stringValue(resource, 'status') } : {}),
    ...(stringValue(relatedIds, 'order_id')
      ? { orderId: stringValue(relatedIds, 'order_id') }
      : {}),
    ...(stringValue(relatedIds, 'capture_id')
      ? { captureId: stringValue(relatedIds, 'capture_id') }
      : {}),
    ...(stringValue(resource, 'custom_id') ? { customId: stringValue(resource, 'custom_id') } : {}),
    ...(stringValue(amount, 'value') ? { amountValue: stringValue(amount, 'value') } : {}),
    ...(stringValue(amount, 'currency_code')
      ? { currency: stringValue(amount, 'currency_code') }
      : {}),
  };
}

function minimize(record: PaypalWebhookEventRecord): PaypalWebhookEventRecord {
  return { ...record, payload: minimizeWebhookPayload(record.payload) };
}

function objectValue(
  object: Readonly<Record<string, unknown>> | undefined,
  key: string,
): Readonly<Record<string, unknown>> | undefined {
  const value = object?.[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;
}

function stringValue(
  object: Readonly<Record<string, unknown>> | undefined,
  key: string,
): string | undefined {
  const value = object?.[key];
  return typeof value === 'string' ? value : undefined;
}
