import type { Clock, IdGenerator } from '@carlos-pinto/contracts';
import { describe, expect, it } from 'vitest';

import { MinimizingWebhookEventRepository } from '../../src/payments/adapters/minimizing-webhook-event-repository.js';
import { PayPalWebhookService } from '../../src/payments/application/webhook-service.js';
import { InMemoryPersistence } from '../../src/persistence/adapters/in-memory/in-memory-persistence.js';
import { paymentRequestFixture } from '../persistence/payment-fixtures.js';
import { FakePaymentGateway } from './fake-payment-gateway.js';

const clock: Clock = { now: () => new Date('2026-06-15T12:00:00.000Z') };
const ids: IdGenerator = (() => {
  let value = 100;
  return {
    generate: () => `00000000-0000-4000-8000-${String(value++).padStart(12, '0')}`,
  };
})();

const headers = {
  'paypal-transmission-id': 'transmission-1',
  'paypal-transmission-time': '2026-06-15T12:00:00Z',
  'paypal-transmission-sig': 'signature',
  'paypal-cert-url': 'https://api.paypal.com/cert.pem',
  'paypal-auth-algo': 'SHA256withRSA',
};

function completedEvent(
  eventId = 'WH-EVENT-1',
  value = '125.00',
): Readonly<Record<string, unknown>> {
  return {
    id: eventId,
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    payer: {
      email_address: 'private-payer@example.com',
      name: { given_name: 'Private', surname: 'Payer' },
    },
    links: [{ href: 'https://api.paypal.com/private/resource', rel: 'self' }],
    resource: {
      id: 'CAPTURE-123',
      status: 'COMPLETED',
      custom_id: 'internal-payment-reference',
      amount: { value, currency_code: 'EUR' },
      supplementary_data: { related_ids: { order_id: 'ORDER-123' } },
      payer: { email_address: 'nested-private@example.com' },
    },
  };
}

function harness() {
  const persistence = new InMemoryPersistence();
  const gateway = new FakePaymentGateway();
  const service = new PayPalWebhookService({
    paymentRequests: persistence.paymentRequests,
    paymentEvents: persistence.paymentEvents,
    webhookEvents: new MinimizingWebhookEventRepository(persistence.paypalWebhookEvents),
    audit: persistence.auditEvents,
    unitOfWork: persistence,
    gateway,
    clock,
    ids,
  });
  return { persistence, gateway, service };
}

describe('PayPal webhook processing', () => {
  it('marks a payment paid only after signature and amount verification', async () => {
    const { persistence, gateway, service } = harness();
    const payment = paymentRequestFixture({
      amountMinor: 12500,
      currency: 'EUR',
      status: 'processing',
      providerOrderId: 'ORDER-123',
    });
    await persistence.paymentRequests.insert(payment);

    const result = await service.process(headers, completedEvent());
    const duplicate = await service.process(headers, completedEvent());
    const stored = await persistence.paymentRequests.getById(payment.id);
    const webhook = await persistence.paypalWebhookEvents.findByProviderEventId('WH-EVENT-1');

    expect(result).toMatchObject({
      accepted: true,
      duplicate: false,
      paymentRequestId: payment.id,
    });
    expect(duplicate).toMatchObject({ accepted: true, duplicate: true });
    expect(stored?.status).toBe('paid');
    expect(webhook?.verificationStatus).toBe('verified');
    expect(webhook?.payload).toEqual({
      providerEventId: 'WH-EVENT-1',
      eventType: 'PAYMENT.CAPTURE.COMPLETED',
      resourceId: 'CAPTURE-123',
      resourceStatus: 'COMPLETED',
      orderId: 'ORDER-123',
      customId: 'internal-payment-reference',
      amountValue: '125.00',
      currency: 'EUR',
    });
    const serializedWebhook = JSON.stringify(webhook);
    expect(serializedWebhook).not.toContain('private-payer@example.com');
    expect(serializedWebhook).not.toContain('nested-private@example.com');
    expect(serializedWebhook).not.toContain('api.paypal.com/private');
    expect(await persistence.paymentEvents.listByPaymentRequestId(payment.id)).toHaveLength(1);
    expect(await persistence.auditEvents.listByEntity('payment_request', payment.id)).toHaveLength(
      1,
    );
    expect(gateway.verificationCalls).toHaveLength(1);
  });

  it('records verified amount mismatches without changing payment status', async () => {
    const { persistence, service } = harness();
    const payment = paymentRequestFixture({
      amountMinor: 12500,
      currency: 'EUR',
      status: 'processing',
      providerOrderId: 'ORDER-123',
    });
    await persistence.paymentRequests.insert(payment);

    const result = await service.process(headers, completedEvent('WH-EVENT-2', '1.00'));
    const webhook = await persistence.paypalWebhookEvents.findByProviderEventId('WH-EVENT-2');

    expect(result).toMatchObject({
      accepted: true,
      duplicate: false,
      paymentRequestId: payment.id,
      reason: 'PAYMENT_AMOUNT_MISMATCH',
    });
    expect((await persistence.paymentRequests.getById(payment.id))?.status).toBe('processing');
    expect(webhook?.processingError).toBe('PAYMENT_AMOUNT_MISMATCH');
    expect(webhook?.payload).not.toHaveProperty('payer');
  });

  it('rejects invalid signatures and safely ignores duplicate rejected events', async () => {
    const { persistence, gateway, service } = harness();
    gateway.verified = false;

    const rejected = await service.process(headers, completedEvent('WH-EVENT-3'));
    const duplicate = await service.process(headers, completedEvent('WH-EVENT-3'));
    const webhook = await persistence.paypalWebhookEvents.findByProviderEventId('WH-EVENT-3');

    expect(rejected).toEqual({
      accepted: false,
      duplicate: false,
      reason: 'PAYPAL_SIGNATURE_REJECTED',
    });
    expect(duplicate).toMatchObject({ accepted: false, duplicate: true });
    expect(webhook?.verificationStatus).toBe('rejected');
    expect(webhook?.payload).not.toHaveProperty('payer');
    expect(gateway.verificationCalls).toHaveLength(1);
  });
});
