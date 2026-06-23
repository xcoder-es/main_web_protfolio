import { Resend } from 'resend';
import {
  NotificationSenderError,
  type NotificationMessage,
  type NotificationSendResult,
  type NotificationSender,
} from '../application/ports.js';

type ResendSenderConfig = Readonly<{
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}>;

type ResendEmailResponse = Readonly<{
  data?: Readonly<{ id?: string }>;
  error?: unknown;
  name?: string;
}>;

export class ResendNotificationSender implements NotificationSender {
  private readonly resend: Resend;
  private readonly timeoutMs: number;

  public constructor(private readonly config: ResendSenderConfig) {
    this.resend = new Resend(config.apiKey, config.baseUrl ? { baseUrl: config.baseUrl } : {});
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  public async send(message: NotificationMessage): Promise<NotificationSendResult> {
    try {
      const response = await Promise.race([
        this.resend.emails.send(
          {
            from: message.from,
            to: [message.to],
            subject: message.subject,
            text: message.text,
            html: message.html,
          },
          { idempotencyKey: message.idempotencyKey },
        ),
        timeout(this.timeoutMs),
      ]);

      const payload = response as ResendEmailResponse;
      if (payload.error) throw translateResendError(payload.error, payload.name);

      const providerMessageId = payload.data?.id?.trim();
      if (!providerMessageId) {
        throw new NotificationSenderError(
          'RESEND_INVALID_RESPONSE',
          'Resend returned an invalid response.',
          false,
        );
      }

      return { providerMessageId };
    } catch (error) {
      if (error instanceof NotificationSenderError) throw error;
      throw new NotificationSenderError(
        error instanceof DOMException && error.name === 'TimeoutError'
          ? 'RESEND_TIMEOUT'
          : 'RESEND_UNAVAILABLE',
        'Resend could not be reached.',
        true,
      );
    }
  }
}

function timeout(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(
      () => reject(new DOMException('Resend request timed out.', 'TimeoutError')),
      timeoutMs,
    );
  });
}

function translateResendError(error: unknown, fallbackName?: string): NotificationSenderError {
  const providerCode =
    stringValue(error, 'name') ?? stringValue(error, 'type') ?? fallbackName ?? 'RESEND_REJECTED';
  const retryable = providerCode.includes('RATE_LIMIT') || providerCode.includes('INTERNAL');

  return new NotificationSenderError(
    providerCode.startsWith('RESEND_') ? providerCode : `RESEND_${providerCode.toUpperCase()}`,
    'Resend rejected notification delivery.',
    retryable,
  );
}

function stringValue(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'string' && candidate.trim() ? candidate : undefined;
}
