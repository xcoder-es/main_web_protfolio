import type { Clock, IdGenerator } from '@carlos-pinto/contracts';

import type {
  AuditEventRepository,
  PaymentEventRepository,
  PaymentRequestRepository,
  PaypalWebhookEventRepository,
  UnitOfWork,
} from '../../persistence/application/ports.js';
import type {
  AuditEventRecord,
  PaymentRequestRecord,
  PaypalWebhookEventRecord,
} from '../../persistence/application/records.js';
import {
  assertPaymentTransition,
  createMoney,
  fromPayPalAmount,
  moneyEquals,
  PaymentDomainError,
  type PaymentStatus,
} from '../domain/model.js';
import { PaymentApplicationError } from './errors.js';
import type { PaymentGateway, PayPalWebhookVerificationInput } from './ports.js';

type Dependencies = Readonly<{
  paymentRequests: PaymentRequestRepository;
  paymentEvents: PaymentEventRepository;
  webhookEvents: PaypalWebhookEventRepository;
  audit: AuditEventRepository;
  unitOfWork: UnitOfWork;
  gateway: PaymentGateway;
  clock: Clock;
  ids: IdGenerator;
}>;

export type PayPalWebhookResult = Readonly<{
  accepted: boolean;
  duplicate: boolean;
  paymentRequestId?: string;
  reason?: string;
}>;

export class PayPalWebhookService {
  public constructor(private readonly dependencies: Dependencies) {}

  public async process(
    headers: Readonly<Record<string, string | undefined>>,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<PayPalWebhookResult> {
    const providerEventId = stringValue(payload, 'id');
    const eventType = stringValue(payload, 'event_type');
    if (!providerEventId || !eventType) {
      throw new PaymentApplicationError(
        'PAYPAL_WEBHOOK_INVALID',
        'PayPal webhook payload is invalid.',
        400,
      );
    }

    const existing = await this.dependencies.webhookEvents.findByProviderEventId(providerEventId);
    if (
      existing &&
      existing.processedAt &&
      (existing.verificationStatus === 'verified' || existing.verificationStatus === 'rejected')
    ) {
      return {
        accepted: existing.verificationStatus === 'verified',
        duplicate: true,
        ...(existing.processingError ? { reason: existing.processingError } : {}),
      };
    }

    const record = existing ?? (await this.insertPending(providerEventId, eventType, payload));
    const verificationInput = verificationRequest(headers, payload);

    let verified: boolean;
    try {
      verified = await this.dependencies.gateway.verifyWebhook(verificationInput);
    } catch (error) {
      await this.dependencies.webhookEvents.update({
        ...record,
        verificationStatus: 'failed',
        processingError: 'PAYPAL_VERIFICATION_UNAVAILABLE',
      });
      throw error;
    }

    if (!verified) {
      const now = this.dependencies.clock.now();
      await this.dependencies.webhookEvents.update({
        ...record,
        verificationStatus: 'rejected',
        processedAt: now,
        processingError: 'PAYPAL_SIGNATURE_REJECTED',
      });
      return { accepted: false, duplicate: false, reason: 'PAYPAL_SIGNATURE_REJECTED' };
    }

    return this.dependencies.unitOfWork.execute(async () => {
      const reconciliation = await this.reconcile(eventType, providerEventId, payload);
      const now = this.dependencies.clock.now();
      const verifiedRecord: PaypalWebhookEventRecord = {
        ...record,
        verificationStatus: 'verified',
        processedAt: now,
        ...(reconciliation.reason ? { processingError: reconciliation.reason } : {}),
      };
      await this.dependencies.webhookEvents.update(verifiedRecord);
      return {
        accepted: true,
        duplicate: false,
        ...(reconciliation.paymentRequestId
          ? { paymentRequestId: reconciliation.paymentRequestId }
          : {}),
        ...(reconciliation.reason ? { reason: reconciliation.reason } : {}),
      };
    });
  }

  private async reconcile(
    eventType: string,
    providerEventId: string,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<Readonly<{ paymentRequestId?: string; reason?: string }>> {
    if (
      eventType !== 'PAYMENT.CAPTURE.COMPLETED' &&
      eventType !== 'PAYMENT.CAPTURE.DENIED' &&
      eventType !== 'PAYMENT.CAPTURE.REFUNDED'
    ) {
      return { reason: 'PAYPAL_EVENT_IGNORED' };
    }

    const resource = objectValue(payload, 'resource');
    if (!resource) return { reason: 'PAYPAL_RESOURCE_INVALID' };
    const captureId = stringValue(resource, 'id');
    const relatedIds = objectValue(objectValue(resource, 'supplementary_data'), 'related_ids');
    const orderId = stringValue(relatedIds, 'order_id');
    const relatedCaptureId = stringValue(relatedIds, 'capture_id');
    const customId = stringValue(resource, 'custom_id');
    const payment = await this.findPayment(orderId, relatedCaptureId, customId);
    if (!payment) return { reason: 'PAYMENT_REQUEST_NOT_FOUND' };

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const amount = objectValue(resource, 'amount');
      const value = stringValue(amount, 'value');
      const currency = stringValue(amount, 'currency_code');
      if (!value || !currency) {
        return { paymentRequestId: payment.id, reason: 'PAYPAL_AMOUNT_MISSING' };
      }
      let received;
      try {
        received = fromPayPalAmount(value, currency);
      } catch {
        return { paymentRequestId: payment.id, reason: 'PAYPAL_AMOUNT_INVALID' };
      }
      const expected = createMoney(payment.amountMinor, payment.currency);
      if (!moneyEquals(received, expected)) {
        return { paymentRequestId: payment.id, reason: 'PAYMENT_AMOUNT_MISMATCH' };
      }
      await this.applyStatus(
        payment,
        'paid',
        eventType,
        captureId ?? providerEventId,
        payloadSummary(orderId, captureId, received.amountMinor, received.currency),
      );
      return { paymentRequestId: payment.id };
    }

    if (eventType === 'PAYMENT.CAPTURE.DENIED') {
      await this.applyStatus(
        payment,
        'failed',
        eventType,
        captureId ?? providerEventId,
        payloadSummary(orderId, captureId),
      );
      return { paymentRequestId: payment.id };
    }

    await this.applyStatus(
      payment,
      'refunded',
      eventType,
      providerEventId,
      payloadSummary(orderId, relatedCaptureId ?? captureId),
    );
    return { paymentRequestId: payment.id };
  }

  private async findPayment(
    orderId: string | undefined,
    captureId: string | undefined,
    customId: string | undefined,
  ): Promise<PaymentRequestRecord | null> {
    if (orderId) {
      const byOrder = await this.dependencies.paymentRequests.findByProviderOrderId(orderId);
      if (byOrder) return byOrder;
    }
    if (captureId) {
      const captureEvent = await this.dependencies.paymentEvents.findByProviderEventId(
        'paypal',
        captureId,
      );
      if (captureEvent) {
        return this.dependencies.paymentRequests.getById(captureEvent.paymentRequestId);
      }
    }
    if (customId) return this.dependencies.paymentRequests.getById(customId);
    return null;
  }

  private async applyStatus(
    payment: PaymentRequestRecord,
    status: PaymentStatus,
    eventType: string,
    providerEventId: string,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const existingEvent = await this.dependencies.paymentEvents.findByProviderEventId(
      'paypal',
      providerEventId,
    );
    if (existingEvent) return;

    if (payment.status !== status) {
      try {
        assertPaymentTransition(payment.status, status);
      } catch (error) {
        if (error instanceof PaymentDomainError) return;
        throw error;
      }
      const now = this.dependencies.clock.now();
      await this.dependencies.paymentRequests.update({
        ...payment,
        status,
        ...(status === 'paid' ? { paidAt: now } : {}),
        updatedAt: now,
      });
    }

    const now = this.dependencies.clock.now();
    await this.dependencies.paymentEvents.insert({
      id: this.dependencies.ids.generate(),
      paymentRequestId: payment.id,
      provider: 'paypal',
      eventType,
      providerEventId,
      payload,
      occurredAt: now,
      createdAt: now,
    });
    const audit: AuditEventRecord = {
      id: this.dependencies.ids.generate(),
      actorType: 'provider',
      actorId: 'paypal',
      action: `payment.webhook.${status}`,
      entityType: 'payment_request',
      entityId: payment.id,
      correlationId: `paypal:${providerEventId}`,
      metadata: { status, eventType },
      createdAt: now,
    };
    await this.dependencies.audit.insert(audit);
  }

  private async insertPending(
    providerEventId: string,
    eventType: string,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<PaypalWebhookEventRecord> {
    const record: PaypalWebhookEventRecord = {
      id: this.dependencies.ids.generate(),
      providerEventId,
      eventType,
      verificationStatus: 'pending',
      payload,
      receivedAt: this.dependencies.clock.now(),
    };
    await this.dependencies.webhookEvents.insert(record);
    return record;
  }
}

function verificationRequest(
  headers: Readonly<Record<string, string | undefined>>,
  payload: Readonly<Record<string, unknown>>,
): PayPalWebhookVerificationInput {
  const transmissionId = header(headers, 'paypal-transmission-id');
  const transmissionTime = header(headers, 'paypal-transmission-time');
  const transmissionSignature = header(headers, 'paypal-transmission-sig');
  const certificateUrl = header(headers, 'paypal-cert-url');
  const authenticationAlgorithm = header(headers, 'paypal-auth-algo');
  if (
    !transmissionId ||
    !transmissionTime ||
    !transmissionSignature ||
    !certificateUrl ||
    !authenticationAlgorithm
  ) {
    throw new PaymentApplicationError(
      'PAYPAL_WEBHOOK_INVALID',
      'PayPal webhook headers are invalid.',
      400,
    );
  }
  return {
    transmissionId,
    transmissionTime,
    transmissionSignature,
    certificateUrl,
    authenticationAlgorithm,
    webhookEvent: payload,
  };
}

function header(
  headers: Readonly<Record<string, string | undefined>>,
  name: string,
): string | undefined {
  return headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
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

function payloadSummary(
  orderId?: string,
  captureId?: string,
  amountMinor?: number,
  currency?: string,
): Readonly<Record<string, unknown>> {
  return {
    ...(orderId ? { orderId } : {}),
    ...(captureId ? { captureId } : {}),
    ...(amountMinor !== undefined ? { amountMinor } : {}),
    ...(currency ? { currency } : {}),
  };
}
