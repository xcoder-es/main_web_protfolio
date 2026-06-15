import type { Clock, IdGenerator } from '@carlos-pinto/contracts';

import type {
  AuditEventRepository,
  PaymentEventRepository,
  PaymentRequestRepository,
  UnitOfWork,
} from '../../persistence/application/ports.js';
import type {
  AuditEventRecord,
  PaymentEventRecord,
  PaymentRequestRecord,
} from '../../persistence/application/records.js';
import {
  assertPaymentTransition,
  createMoney,
  moneyEquals,
  PaymentDomainError,
  type PaymentStatus,
} from '../domain/model.js';
import { PaymentApplicationError } from './errors.js';
import type { PaymentGateway } from './ports.js';

export type PaymentActor = Readonly<{
  type: 'visitor' | 'administrator' | 'system' | 'provider';
  id?: string;
  correlationId: string;
}>;

export type CreatePaymentRequestInput = Readonly<{
  leadId?: string;
  title: string;
  description?: string;
  amountMinor: number;
  currency: string;
  expiresAt?: Date;
}>;

type Dependencies = Readonly<{
  paymentRequests: PaymentRequestRepository;
  paymentEvents: PaymentEventRepository;
  audit: AuditEventRepository;
  unitOfWork: UnitOfWork;
  gateway: PaymentGateway;
  clock: Clock;
  ids: IdGenerator;
}>;

export class PaymentsService {
  public constructor(private readonly dependencies: Dependencies) {}

  public async createRequest(
    input: CreatePaymentRequestInput,
    actor: PaymentActor,
  ): Promise<PaymentRequestRecord> {
    const title = input.title.trim();
    const description = input.description?.trim();
    if (title.length < 3 || title.length > 160) {
      throw new PaymentApplicationError(
        'INVALID_PAYMENT_REQUEST',
        'Payment request is invalid.',
        400,
        { title: ['Title must contain between 3 and 160 characters.'] },
      );
    }
    if (description && description.length > 2000) {
      throw new PaymentApplicationError(
        'INVALID_PAYMENT_REQUEST',
        'Payment request is invalid.',
        400,
        { description: ['Description must not exceed 2000 characters.'] },
      );
    }

    let money;
    try {
      money = createMoney(input.amountMinor, input.currency);
    } catch {
      throw new PaymentApplicationError(
        'INVALID_PAYMENT_REQUEST',
        'Payment request is invalid.',
        400,
        { amountMinor: ['Amount and currency must define positive minor units.'] },
      );
    }

    const now = this.dependencies.clock.now();
    if (input.expiresAt && input.expiresAt <= now) {
      throw new PaymentApplicationError(
        'INVALID_PAYMENT_REQUEST',
        'Payment request is invalid.',
        400,
        { expiresAt: ['Expiration must be in the future.'] },
      );
    }

    const payment: PaymentRequestRecord = {
      id: this.dependencies.ids.generate(),
      ...(input.leadId ? { leadId: input.leadId } : {}),
      publicToken: this.dependencies.ids.generate(),
      title,
      ...(description ? { description } : {}),
      amountMinor: money.amountMinor,
      currency: money.currency,
      status: 'draft',
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      createdAt: now,
      updatedAt: now,
    };

    await this.dependencies.unitOfWork.execute(async () => {
      await this.dependencies.paymentRequests.insert(payment);
      await this.writeEvent(payment.id, 'payment.request.created', 'internal', undefined, {
        amountMinor: payment.amountMinor,
        currency: payment.currency,
      });
      await this.writeAudit(actor, 'payment.request.created', payment.id, {
        status: payment.status,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
      });
    });
    return payment;
  }

  public async activate(id: string, actor: PaymentActor): Promise<PaymentRequestRecord> {
    return this.transition(id, 'active', actor, 'payment.request.activated');
  }

  public async cancel(id: string, actor: PaymentActor): Promise<PaymentRequestRecord> {
    return this.transition(id, 'cancelled', actor, 'payment.request.cancelled');
  }

  public async getById(id: string): Promise<PaymentRequestRecord> {
    return this.requireById(id);
  }

  public async getByPublicToken(publicToken: string): Promise<PaymentRequestRecord> {
    const payment = await this.dependencies.paymentRequests.findByPublicToken(publicToken);
    if (!payment) throw notFound();
    return this.expireIfNeeded(payment);
  }

  public async list(): Promise<readonly PaymentRequestRecord[]> {
    const payments = await this.dependencies.paymentRequests.list();
    return [...payments].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  public async getHistory(id: string): Promise<readonly PaymentEventRecord[]> {
    await this.requireById(id);
    return this.dependencies.paymentEvents.listByPaymentRequestId(id);
  }

  public async createProviderOrder(
    publicToken: string,
    actor: PaymentActor,
  ): Promise<Readonly<{ orderId: string; created: boolean; approvalUrl?: string }>> {
    const payment = await this.getByPublicToken(publicToken);
    if (payment.status !== 'active' && payment.status !== 'processing') {
      throw new PaymentApplicationError(
        'PAYMENT_NOT_AVAILABLE',
        'This payment request is not available for checkout.',
        409,
      );
    }
    if (payment.providerOrderId) {
      return { orderId: payment.providerOrderId, created: false };
    }

    const order = await this.dependencies.gateway.createOrder({
      paymentRequestId: payment.id,
      title: payment.title,
      ...(payment.description ? { description: payment.description } : {}),
      money: createMoney(payment.amountMinor, payment.currency),
      idempotencyKey: `payment-order:${payment.id}`,
    });
    if (!order.orderId.trim()) {
      throw new PaymentApplicationError(
        'PAYMENT_NOT_AVAILABLE',
        'PayPal returned an invalid order.',
        502,
      );
    }

    const now = this.dependencies.clock.now();
    const updated: PaymentRequestRecord = {
      ...payment,
      status: 'processing',
      provider: 'paypal',
      providerOrderId: order.orderId,
      updatedAt: now,
    };
    await this.dependencies.unitOfWork.execute(async () => {
      await this.dependencies.paymentRequests.update(updated);
      await this.writeEvent(
        payment.id,
        'paypal.order.created',
        'paypal',
        `order:${order.orderId}`,
        { orderId: order.orderId, providerStatus: order.status },
      );
      await this.writeAudit(actor, 'payment.order.created', payment.id, {
        orderId: order.orderId,
      });
    });

    return {
      orderId: order.orderId,
      created: true,
      ...(order.approvalUrl ? { approvalUrl: order.approvalUrl } : {}),
    };
  }

  public async captureProviderOrder(
    publicToken: string,
    orderId: string,
    actor: PaymentActor,
  ): Promise<PaymentRequestRecord> {
    const payment = await this.getByPublicToken(publicToken);
    if (payment.status === 'paid') return payment;
    if (!payment.providerOrderId || payment.providerOrderId !== orderId) {
      throw new PaymentApplicationError(
        'PAYMENT_ORDER_MISMATCH',
        'The PayPal order does not belong to this payment request.',
        409,
      );
    }

    const capture = await this.dependencies.gateway.captureOrder({
      orderId,
      idempotencyKey: `payment-capture:${payment.id}`,
    });
    const expected = createMoney(payment.amountMinor, payment.currency);
    if (capture.orderId !== orderId || !moneyEquals(capture.money, expected)) {
      throw new PaymentApplicationError(
        'PAYMENT_AMOUNT_MISMATCH',
        'PayPal did not verify the expected payment amount.',
        409,
      );
    }

    const nextStatus: PaymentStatus =
      capture.status === 'COMPLETED'
        ? 'paid'
        : capture.status === 'FAILED'
          ? 'failed'
          : 'processing';
    assertTransition(payment.status, nextStatus);
    const now = this.dependencies.clock.now();
    const updated: PaymentRequestRecord = {
      ...payment,
      status: nextStatus,
      ...(nextStatus === 'paid' ? { paidAt: now } : {}),
      updatedAt: now,
    };
    const providerEventId = capture.captureId ?? `capture:${orderId}:${capture.status}`;

    await this.dependencies.unitOfWork.execute(async () => {
      await this.dependencies.paymentRequests.update(updated);
      const existing = await this.dependencies.paymentEvents.findByProviderEventId(
        'paypal',
        providerEventId,
      );
      if (!existing) {
        await this.writeEvent(
          payment.id,
          `paypal.capture.${capture.status.toLowerCase()}`,
          'paypal',
          providerEventId,
          {
            orderId,
            ...(capture.captureId ? { captureId: capture.captureId } : {}),
            amountMinor: capture.money.amountMinor,
            currency: capture.money.currency,
          },
        );
      }
      await this.writeAudit(actor, 'payment.capture.verified', payment.id, {
        status: nextStatus,
        orderId,
      });
    });
    return updated;
  }

  private async transition(
    id: string,
    status: PaymentStatus,
    actor: PaymentActor,
    action: string,
  ): Promise<PaymentRequestRecord> {
    const payment = await this.requireById(id);
    if (payment.status === status) return payment;
    assertTransition(payment.status, status);
    const now = this.dependencies.clock.now();
    const updated: PaymentRequestRecord = {
      ...payment,
      status,
      ...(status === 'cancelled' ? { cancelledAt: now } : {}),
      updatedAt: now,
    };
    await this.dependencies.unitOfWork.execute(async () => {
      await this.dependencies.paymentRequests.update(updated);
      await this.writeEvent(id, action, 'internal', undefined, { status });
      await this.writeAudit(actor, action, id, { status });
    });
    return updated;
  }

  private async expireIfNeeded(payment: PaymentRequestRecord): Promise<PaymentRequestRecord> {
    if (
      payment.expiresAt &&
      payment.expiresAt <= this.dependencies.clock.now() &&
      (payment.status === 'active' || payment.status === 'processing')
    ) {
      const now = this.dependencies.clock.now();
      const expired = { ...payment, status: 'expired' as const, updatedAt: now };
      await this.dependencies.paymentRequests.update(expired);
      return expired;
    }
    return payment;
  }

  private async requireById(id: string): Promise<PaymentRequestRecord> {
    const payment = await this.dependencies.paymentRequests.getById(id);
    if (!payment) throw notFound();
    return payment;
  }

  private async writeEvent(
    paymentRequestId: string,
    eventType: string,
    provider: 'paypal' | 'internal',
    providerEventId: string | undefined,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const now = this.dependencies.clock.now();
    await this.dependencies.paymentEvents.insert({
      id: this.dependencies.ids.generate(),
      paymentRequestId,
      provider,
      eventType,
      ...(providerEventId ? { providerEventId } : {}),
      payload,
      occurredAt: now,
      createdAt: now,
    });
  }

  private async writeAudit(
    actor: PaymentActor,
    action: string,
    paymentRequestId: string,
    metadata: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const event: AuditEventRecord = {
      id: this.dependencies.ids.generate(),
      actorType: actor.type,
      ...(actor.id ? { actorId: actor.id } : {}),
      action,
      entityType: 'payment_request',
      entityId: paymentRequestId,
      correlationId: actor.correlationId,
      metadata,
      createdAt: this.dependencies.clock.now(),
    };
    await this.dependencies.audit.insert(event);
  }
}

function assertTransition(from: PaymentStatus, to: PaymentStatus): void {
  try {
    assertPaymentTransition(from, to);
  } catch (error) {
    if (error instanceof PaymentDomainError) {
      throw new PaymentApplicationError(
        'INVALID_PAYMENT_TRANSITION',
        error.message,
        409,
      );
    }
    throw error;
  }
}

function notFound(): PaymentApplicationError {
  return new PaymentApplicationError(
    'PAYMENT_REQUEST_NOT_FOUND',
    'Payment request was not found.',
    404,
  );
}
