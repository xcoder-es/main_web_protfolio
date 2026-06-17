import { describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { createApplicationDependencies } from '../../src/composition.js';
import type { ApiRuntimeConfig } from '../../src/infrastructure/config.js';
import { administratorHeaders, administratorIdentityOverrides } from '../support/identity.js';
import { FakePaymentGateway } from './fake-payment-gateway.js';

const config: ApiRuntimeConfig = {
  environment: 'test',
  host: '127.0.0.1',
  port: 3000,
  logLevel: 'silent',
  trustProxy: false,
  allowedOrigins: ['https://portfolio.example.com'],
  bodyLimit: 65_536,
  rateLimitMax: 100,
  rateLimitWindowMs: 60_000,
  features: {
    persistence: false,
    identity: false,
    notifications: false,
    payments: false,
    spamVerification: false,
  },
};

async function createActivePayment() {
  const gateway = new FakePaymentGateway();
  const dependencies = createApplicationDependencies(config, {
    ...administratorIdentityOverrides(),
    paymentGateway: gateway,
  });
  const app = await buildApp(config, dependencies);
  const created = await app.inject({
    method: 'POST',
    url: '/api/admin/payment-requests',
    headers: administratorHeaders,
    payload: {
      title: 'Architecture engagement',
      description: 'Initial delivery milestone',
      amountMinor: 12500,
      currency: 'EUR',
    },
  });
  const payment = created.json();
  const activated = await app.inject({
    method: 'POST',
    url: `/api/admin/payment-requests/${payment.id}/activate`,
    headers: administratorHeaders,
  });
  expect(created.statusCode).toBe(201);
  expect(activated.statusCode).toBe(200);
  return { app, gateway, payment: activated.json() };
}

describe('payment HTTP routes', () => {
  it('protects owner operations and ignores visitor-supplied amounts', async () => {
    const { app, gateway, payment } = await createActivePayment();

    const unauthenticated = await app.inject({
      method: 'GET',
      url: '/api/admin/payment-requests',
    });
    expect(unauthenticated.statusCode).toBe(401);

    const details = await app.inject({
      method: 'GET',
      url: `/api/public/payment-requests/${payment.publicToken}`,
    });
    expect(details.statusCode).toBe(200);
    expect(details.json()).toMatchObject({ amountMinor: 12500, currency: 'EUR', status: 'active' });

    const order = await app.inject({
      method: 'POST',
      url: `/api/public/payment-requests/${payment.publicToken}/orders`,
      payload: { amountMinor: 1, currency: 'USD' },
    });
    const duplicateOrder = await app.inject({
      method: 'POST',
      url: `/api/public/payment-requests/${payment.publicToken}/orders`,
    });
    expect(order.statusCode).toBe(201);
    expect(duplicateOrder.statusCode).toBe(200);
    expect(gateway.createCalls).toHaveLength(1);
    expect(gateway.createCalls[0]?.money).toEqual({ amountMinor: 12500, currency: 'EUR' });

    const captured = await app.inject({
      method: 'POST',
      url: `/api/public/payment-requests/${payment.publicToken}/capture`,
      payload: { orderId: 'ORDER-123', amountMinor: 1 },
    });
    expect(captured.statusCode).toBe(200);
    expect(captured.json().status).toBe('paid');

    const history = await app.inject({
      method: 'GET',
      url: `/api/admin/payment-requests/${payment.id}/events`,
      headers: administratorHeaders,
    });
    expect(history.statusCode).toBe(200);
    expect(history.json()).toHaveLength(4);
    await app.close();
  });

  it('completes payment only after a verified PayPal webhook', async () => {
    const { app, payment } = await createActivePayment();
    await app.inject({
      method: 'POST',
      url: `/api/public/payment-requests/${payment.publicToken}/orders`,
    });

    const webhook = await app.inject({
      method: 'POST',
      url: '/api/webhooks/paypal',
      headers: {
        'paypal-transmission-id': 'transmission-1',
        'paypal-transmission-time': '2026-06-15T12:00:00Z',
        'paypal-transmission-sig': 'signature',
        'paypal-cert-url': 'https://api.paypal.com/cert.pem',
        'paypal-auth-algo': 'SHA256withRSA',
      },
      payload: {
        id: 'WH-ROUTE-1',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAPTURE-WEBHOOK-1',
          amount: { value: '125.00', currency_code: 'EUR' },
          supplementary_data: { related_ids: { order_id: 'ORDER-123' } },
        },
      },
    });
    expect(webhook.statusCode).toBe(200);
    expect(webhook.json()).toMatchObject({ accepted: true, duplicate: false });

    const stored = await app.inject({
      method: 'GET',
      url: `/api/admin/payment-requests/${payment.id}`,
      headers: administratorHeaders,
    });
    expect(stored.json().status).toBe('paid');
    await app.close();
  });
});
