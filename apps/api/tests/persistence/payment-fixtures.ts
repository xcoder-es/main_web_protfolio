import type {
  PaymentEventRecord,
  PaymentRequestRecord,
  PaypalWebhookEventRecord,
} from '../../src/persistence/application/records.js';

const timestamp = new Date('2026-06-15T12:00:00.000Z');

export function paymentRequestFixture(
  overrides: Partial<PaymentRequestRecord> = {},
): PaymentRequestRecord {
  return {
    id: '50000000-0000-4000-8000-000000000001',
    leadId: '10000000-0000-4000-8000-000000000001',
    publicToken: '60000000-0000-4000-8000-000000000001',
    title: 'Architecture engagement',
    amountMinor: 100000,
    currency: 'EUR',
    status: 'active',
    provider: 'paypal',
    providerOrderId: 'PAYPAL-ORDER-001',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

export function paymentEventFixture(
  overrides: Partial<PaymentEventRecord> = {},
): PaymentEventRecord {
  return {
    id: '70000000-0000-4000-8000-000000000001',
    paymentRequestId: '50000000-0000-4000-8000-000000000001',
    provider: 'paypal',
    eventType: 'PAYMENT.CAPTURE.COMPLETED',
    providerEventId: 'PAYPAL-EVENT-001',
    payload: { status: 'COMPLETED' },
    occurredAt: timestamp,
    createdAt: timestamp,
    ...overrides,
  };
}

export function paypalWebhookFixture(
  overrides: Partial<PaypalWebhookEventRecord> = {},
): PaypalWebhookEventRecord {
  return {
    id: '80000000-0000-4000-8000-000000000001',
    providerEventId: 'PAYPAL-WEBHOOK-001',
    eventType: 'PAYMENT.CAPTURE.COMPLETED',
    verificationStatus: 'verified',
    payload: { id: 'PAYPAL-WEBHOOK-001' },
    receivedAt: timestamp,
    ...overrides,
  };
}
