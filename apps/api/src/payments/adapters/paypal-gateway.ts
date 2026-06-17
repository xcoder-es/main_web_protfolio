import { fromPayPalAmount, toPayPalAmount } from '../domain/model.js';
import {
  PaymentGatewayError,
  type PayPalWebhookVerificationInput,
  type PaymentGateway,
  type ProviderCapture,
  type ProviderOrder,
} from '../application/ports.js';

type FetchLike = typeof fetch;

export type PayPalGatewayConfig = Readonly<{
  clientId: string;
  clientSecret: string;
  webhookId: string;
  baseUrl: string;
  timeoutMs?: number;
  fetch?: FetchLike;
}>;

type AccessToken = Readonly<{
  value: string;
  expiresAt: number;
}>;

export class PayPalGateway implements PaymentGateway {
  private readonly request: FetchLike;
  private readonly timeoutMs: number;
  private token?: AccessToken;

  public constructor(private readonly config: PayPalGatewayConfig) {
    this.request = config.fetch ?? fetch;
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  public async createOrder(
    input: Parameters<PaymentGateway['createOrder']>[0],
  ): Promise<ProviderOrder> {
    const payload = await this.authorizedJson('/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'paypal-request-id': input.idempotencyKey,
        prefer: 'return=representation',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: input.paymentRequestId,
            custom_id: input.paymentRequestId,
            description: input.description ?? input.title,
            amount: {
              currency_code: input.money.currency,
              value: toPayPalAmount(input.money),
            },
          },
        ],
      }),
    });

    const orderId = stringValue(payload, 'id');
    const status = stringValue(payload, 'status');
    if (!orderId || !status) {
      throw new PaymentGatewayError(
        'PAYPAL_INVALID_ORDER_RESPONSE',
        'PayPal returned an invalid order response.',
        true,
      );
    }
    const approvalUrl = arrayValue(payload, 'links')
      ?.map(asObject)
      .find((link) => stringValue(link, 'rel') === 'approve');
    const approvalHref = stringValue(approvalUrl, 'href');
    return {
      orderId,
      status,
      ...(approvalHref ? { approvalUrl: approvalHref } : {}),
    };
  }

  public async captureOrder(
    input: Parameters<PaymentGateway['captureOrder']>[0],
  ): Promise<ProviderCapture> {
    const payload = await this.authorizedJson(
      `/v2/checkout/orders/${encodeURIComponent(input.orderId)}/capture`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'paypal-request-id': input.idempotencyKey,
          prefer: 'return=representation',
        },
        body: '{}',
      },
    );

    const orderId = stringValue(payload, 'id');
    const purchaseUnit = arrayValue(payload, 'purchase_units')?.map(asObject)[0];
    const payments = objectValue(purchaseUnit, 'payments');
    const capture = arrayValue(payments, 'captures')?.map(asObject)[0];
    const amount = objectValue(capture, 'amount');
    const value = stringValue(amount, 'value');
    const currency = stringValue(amount, 'currency_code');
    const providerStatus = stringValue(capture, 'status') ?? stringValue(payload, 'status');
    if (!orderId || !capture || !value || !currency || !providerStatus) {
      throw new PaymentGatewayError(
        'PAYPAL_INVALID_CAPTURE_RESPONSE',
        'PayPal returned an invalid capture response.',
        true,
      );
    }

    const status: ProviderCapture['status'] =
      providerStatus === 'COMPLETED'
        ? 'COMPLETED'
        : providerStatus === 'PENDING' || providerStatus === 'APPROVED'
          ? 'PENDING'
          : 'FAILED';
    const captureId = stringValue(capture, 'id');
    return {
      orderId,
      ...(captureId ? { captureId } : {}),
      status,
      money: fromPayPalAmount(value, currency),
    };
  }

  public async verifyWebhook(input: PayPalWebhookVerificationInput): Promise<boolean> {
    const payload = await this.authorizedJson('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        auth_algo: input.authenticationAlgorithm,
        cert_url: input.certificateUrl,
        transmission_id: input.transmissionId,
        transmission_sig: input.transmissionSignature,
        transmission_time: input.transmissionTime,
        webhook_id: this.config.webhookId,
        webhook_event: input.webhookEvent,
      }),
    });
    return stringValue(payload, 'verification_status') === 'SUCCESS';
  }

  private async authorizedJson(path: string, init: RequestInit): Promise<Record<string, unknown>> {
    const token = await this.accessToken();
    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${token}`);
    let response: Response;
    try {
      response = await this.request(`${this.config.baseUrl}${path}`, {
        ...init,
        headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new PaymentGatewayError('PAYPAL_UNAVAILABLE', 'PayPal could not be reached.', true);
    }
    const payload = await readJson(response);
    if (!response.ok) {
      throw new PaymentGatewayError(
        `PAYPAL_HTTP_${response.status}`,
        'PayPal rejected the payment operation.',
        response.status === 409 || response.status === 429 || response.status >= 500,
      );
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new PaymentGatewayError(
        'PAYPAL_INVALID_RESPONSE',
        'PayPal returned an invalid response.',
        true,
      );
    }
    return payload as Record<string, unknown>;
  }

  private async accessToken(): Promise<string> {
    const now = Date.now();
    if (this.token && this.token.expiresAt > now + 30_000) return this.token.value;

    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64',
    );
    let response: Response;
    try {
      response = await this.request(`${this.config.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Basic ${credentials}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new PaymentGatewayError(
        'PAYPAL_AUTH_UNAVAILABLE',
        'PayPal authentication could not be reached.',
        true,
      );
    }
    const payload = await readJson(response);
    const value = objectString(payload, 'access_token');
    const expiresIn = objectNumber(payload, 'expires_in');
    if (!response.ok || !value || !expiresIn) {
      throw new PaymentGatewayError(
        'PAYPAL_AUTH_FAILED',
        'PayPal authentication failed.',
        response.status === 429 || response.status >= 500,
      );
    }
    this.token = { value, expiresAt: now + expiresIn * 1000 };
    return value;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function asObject(value: unknown): Readonly<Record<string, unknown>> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : {};
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

function arrayValue(
  object: Readonly<Record<string, unknown>> | undefined,
  key: string,
): readonly unknown[] | undefined {
  const value = object?.[key];
  return Array.isArray(value) ? value : undefined;
}

function stringValue(
  object: Readonly<Record<string, unknown>> | undefined,
  key: string,
): string | undefined {
  const value = object?.[key];
  return typeof value === 'string' ? value : undefined;
}

function objectString(payload: unknown, key: string): string | undefined {
  return stringValue(asObject(payload), key);
}

function objectNumber(payload: unknown, key: string): number | undefined {
  const value = asObject(payload)[key];
  return typeof value === 'number' ? value : undefined;
}
