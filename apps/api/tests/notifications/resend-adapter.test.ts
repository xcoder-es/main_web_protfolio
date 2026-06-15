import { describe, expect, it } from 'vitest';

import { ResendNotificationSender } from '../../src/notifications/adapters/resend-notification-sender.js';
import type { NotificationMessage } from '../../src/notifications/application/ports.js';

const message: NotificationMessage = {
  from: 'Carlos Pinto <notifications@example.com>',
  to: 'carlos@example.com',
  subject: 'New project request',
  text: 'A new request arrived.',
  html: '<p>A new request arrived.</p>',
  idempotencyKey: 'lead-submitted/10000000-0000-4000-8000-000000000001',
};

describe('ResendNotificationSender', () => {
  it('uses the official HTTPS contract and idempotency header', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const request: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), ...(init ? { init } : {}) });
      return new Response(JSON.stringify({ id: 'email-provider-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    const sender = new ResendNotificationSender({
      apiKey: 're_test_key',
      baseUrl: 'https://api.resend.test',
      fetch: request,
    });

    const result = await sender.send(message);
    const call = calls[0];
    expect(call).toBeDefined();
    expect(call?.url).toBe('https://api.resend.test/emails');
    expect(call?.init?.method).toBe('POST');
    const headers = new Headers(call?.init?.headers);
    expect(headers.get('authorization')).toBe('Bearer re_test_key');
    expect(headers.get('idempotency-key')).toBe(message.idempotencyKey);
    expect(JSON.parse(String(call?.init?.body))).toEqual({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    expect(result).toEqual({ providerMessageId: 'email-provider-1' });
  });

  it('classifies rate-limit and provider failures without leaking response payloads', async () => {
    const request: typeof fetch = async () =>
      new Response(
        JSON.stringify({ name: 'rate_limit_exceeded', message: 'provider internal detail' }),
        { status: 429, headers: { 'content-type': 'application/json' } },
      );
    const sender = new ResendNotificationSender({ apiKey: 're_test_key', fetch: request });

    await expect(sender.send(message)).rejects.toMatchObject({
      code: 'RESEND_RATE_LIMIT_EXCEEDED',
      message: 'Resend rejected notification delivery.',
      retryable: true,
    });
  });

  it('rejects malformed success responses as retryable failures', async () => {
    const request: typeof fetch = async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    const sender = new ResendNotificationSender({ apiKey: 're_test_key', fetch: request });

    await expect(sender.send(message)).rejects.toMatchObject({
      code: 'RESEND_INVALID_RESPONSE',
      retryable: true,
    });
  });
});
