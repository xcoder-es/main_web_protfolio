import { describe, expect, it } from 'vitest';

import { PayPalGateway } from '../../src/payments/adapters/paypal-gateway.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('PayPalGateway', () => {
  it('authenticates, creates and captures orders with deterministic request IDs', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const responses = [
      jsonResponse({ access_token: 'access-token', expires_in: 3600 }),
      jsonResponse(
        {
          id: 'ORDER-123',
          status: 'CREATED',
          links: [
            {
              rel: 'approve',
              href: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER-123',
            },
          ],
        },
        201,
      ),
      jsonResponse(
        {
          id: 'ORDER-123',
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: 'CAPTURE-123',
                    status: 'COMPLETED',
                    amount: { value: '125.00', currency_code: 'EUR' },
                  },
                ],
              },
            },
          ],
        },
        201,
      ),
    ];
    const request = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), ...(init ? { init } : {}) });
      const response = responses.shift();
      if (!response) throw new Error('Unexpected request');
      return response;
    }) as typeof fetch;
    const gateway = new PayPalGateway({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      webhookId: 'webhook-id',
      baseUrl: 'https://api-m.sandbox.paypal.test',
      fetch: request,
    });

    const order = await gateway.createOrder({
      paymentRequestId: 'payment-123',
      title: 'Architecture engagement',
      money: { amountMinor: 12500, currency: 'EUR' },
      idempotencyKey: 'payment-order:payment-123',
    });
    const capture = await gateway.captureOrder({
      orderId: 'ORDER-123',
      idempotencyKey: 'payment-capture:payment-123',
    });

    expect(calls[0]?.url).toBe('https://api-m.sandbox.paypal.test/v1/oauth2/token');
    expect(new Headers(calls[0]?.init?.headers).get('authorization')).toMatch(/^Basic /);
    expect(calls[1]?.url).toBe('https://api-m.sandbox.paypal.test/v2/checkout/orders');
    expect(new Headers(calls[1]?.init?.headers).get('paypal-request-id')).toBe(
      'payment-order:payment-123',
    );
    expect(JSON.parse(String(calls[1]?.init?.body))).toMatchObject({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: 'payment-123',
          custom_id: 'payment-123',
          amount: { currency_code: 'EUR', value: '125.00' },
        },
      ],
    });
    expect(calls[2]?.url).toBe(
      'https://api-m.sandbox.paypal.test/v2/checkout/orders/ORDER-123/capture',
    );
    expect(new Headers(calls[2]?.init?.headers).get('paypal-request-id')).toBe(
      'payment-capture:payment-123',
    );
    expect(order).toMatchObject({ orderId: 'ORDER-123', status: 'CREATED' });
    expect(capture).toEqual({
      orderId: 'ORDER-123',
      captureId: 'CAPTURE-123',
      status: 'COMPLETED',
      money: { amountMinor: 12500, currency: 'EUR' },
    });
    expect(calls.filter((call) => call.url.endsWith('/v1/oauth2/token'))).toHaveLength(1);
  });

  it('posts the required webhook verification fields', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const responses = [
      jsonResponse({ access_token: 'access-token', expires_in: 3600 }),
      jsonResponse({ verification_status: 'SUCCESS' }),
    ];
    const request = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), ...(init ? { init } : {}) });
      return responses.shift() ?? jsonResponse({}, 500);
    }) as typeof fetch;
    const gateway = new PayPalGateway({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      webhookId: 'webhook-id',
      baseUrl: 'https://api-m.sandbox.paypal.test',
      fetch: request,
    });

    const verified = await gateway.verifyWebhook({
      transmissionId: 'transmission-id',
      transmissionTime: '2026-06-15T12:00:00Z',
      transmissionSignature: 'signature',
      certificateUrl: 'https://api.paypal.com/cert.pem',
      authenticationAlgorithm: 'SHA256withRSA',
      webhookEvent: { id: 'WH-1', event_type: 'PAYMENT.CAPTURE.COMPLETED' },
    });

    expect(verified).toBe(true);
    expect(calls[1]?.url).toBe(
      'https://api-m.sandbox.paypal.test/v1/notifications/verify-webhook-signature',
    );
    expect(JSON.parse(String(calls[1]?.init?.body))).toMatchObject({
      auth_algo: 'SHA256withRSA',
      cert_url: 'https://api.paypal.com/cert.pem',
      transmission_id: 'transmission-id',
      transmission_sig: 'signature',
      transmission_time: '2026-06-15T12:00:00Z',
      webhook_id: 'webhook-id',
    });
  });

  it('returns controlled provider errors without exposing PayPal payloads', async () => {
    const responses = [
      jsonResponse({ access_token: 'access-token', expires_in: 3600 }),
      jsonResponse({ name: 'UNPROCESSABLE_ENTITY', details: [{ issue: 'internal detail' }] }, 422),
    ];
    const request = (async () => responses.shift() ?? jsonResponse({}, 500)) as typeof fetch;
    const gateway = new PayPalGateway({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      webhookId: 'webhook-id',
      baseUrl: 'https://api-m.sandbox.paypal.test',
      fetch: request,
    });

    await expect(
      gateway.createOrder({
        paymentRequestId: 'payment-123',
        title: 'Architecture engagement',
        money: { amountMinor: 12500, currency: 'EUR' },
        idempotencyKey: 'payment-order:payment-123',
      }),
    ).rejects.toMatchObject({
      code: 'PAYPAL_HTTP_422',
      message: 'PayPal rejected the payment operation.',
      retryable: false,
    });
  });
});
