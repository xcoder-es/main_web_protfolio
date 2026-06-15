import {
  NotificationSenderError,
  type NotificationMessage,
  type NotificationSender,
  type NotificationSendResult,
} from '../application/ports.js';

type FetchLike = typeof fetch;

type ResendSenderConfig = Readonly<{
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: FetchLike;
}>;

export class ResendNotificationSender implements NotificationSender {
  private readonly request: FetchLike;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  public constructor(private readonly config: ResendSenderConfig) {
    this.request = config.fetch ?? fetch;
    this.baseUrl = config.baseUrl ?? 'https://api.resend.com';
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  public async send(message: NotificationMessage): Promise<NotificationSendResult> {
    let response: Response;
    try {
      response = await this.request(`${this.baseUrl}/emails`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
          'content-type': 'application/json',
          'idempotency-key': message.idempotencyKey,
        },
        body: JSON.stringify({
          from: message.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new NotificationSenderError(
        error instanceof DOMException && error.name === 'TimeoutError'
          ? 'RESEND_TIMEOUT'
          : 'RESEND_UNAVAILABLE',
        'Resend could not be reached.',
        true,
      );
    }

    const payload = await readJson(response);
    if (!response.ok) {
      const providerCode = stringValue(payload, 'name') ?? stringValue(payload, 'type');
      throw new NotificationSenderError(
        providerCode ? `RESEND_${providerCode.toUpperCase()}` : `RESEND_HTTP_${response.status}`,
        'Resend rejected notification delivery.',
        response.status === 429 || response.status >= 500 || response.status === 409,
      );
    }

    const id = stringValue(payload, 'id');
    if (!id) {
      throw new NotificationSenderError(
        'RESEND_INVALID_RESPONSE',
        'Resend returned an invalid delivery response.',
        true,
      );
    }
    return { providerMessageId: id };
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function stringValue(payload: unknown, key: string): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}
