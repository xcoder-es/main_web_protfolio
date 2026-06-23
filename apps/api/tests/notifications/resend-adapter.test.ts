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
  it('sends emails through the official SDK and returns the provider id', async () => {
    const calls: Array<{
      from: string;
      to: string[];
      subject: string;
      text: string;
      html: string;
      options: { idempotencyKey?: string } | undefined;
    }> = [];
    const sender = new ResendNotificationSender({
      apiKey: 're_test_key',
      baseUrl: 'https://api.resend.test',
    });

    const resend = sender as unknown as {
      resend: {
        emails: {
          send: (
            payload: {
              from: string;
              to: string[];
              subject: string;
              text: string;
              html: string;
            },
            options?: { idempotencyKey?: string },
          ) => Promise<{ data: { id: string }; error: null }>;
        };
      };
    };

    resend.resend.emails.send = async (payload, options) => {
      calls.push({ ...payload, options });
      return { data: { id: 'email-provider-1' }, error: null };
    };

    const result = await sender.send(message);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
      options: { idempotencyKey: message.idempotencyKey },
    });
    expect(result).toEqual({ providerMessageId: 'email-provider-1' });
  });
});
