import type { Money } from '../domain/model.js';

export type ProviderOrder = Readonly<{
  orderId: string;
  status: string;
  approvalUrl?: string;
}>;

export type ProviderCapture = Readonly<{
  orderId: string;
  captureId?: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  money: Money;
}>;

export type PayPalWebhookVerificationInput = Readonly<{
  transmissionId: string;
  transmissionTime: string;
  transmissionSignature: string;
  certificateUrl: string;
  authenticationAlgorithm: string;
  webhookEvent: Readonly<Record<string, unknown>>;
}>;

export interface PaymentGateway {
  createOrder(input: Readonly<{
    paymentRequestId: string;
    title: string;
    description?: string;
    money: Money;
    idempotencyKey: string;
  }>): Promise<ProviderOrder>;

  captureOrder(input: Readonly<{
    orderId: string;
    idempotencyKey: string;
  }>): Promise<ProviderCapture>;

  verifyWebhook(input: PayPalWebhookVerificationInput): Promise<boolean>;
}

export class PaymentGatewayError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'PaymentGatewayError';
  }
}
