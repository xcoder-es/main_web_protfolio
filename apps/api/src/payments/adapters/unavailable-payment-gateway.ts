import {
  PaymentGatewayError,
  type PayPalWebhookVerificationInput,
  type PaymentGateway,
  type ProviderCapture,
  type ProviderOrder,
} from '../application/ports.js';

export class UnavailablePaymentGateway implements PaymentGateway {
  public async createOrder(): Promise<ProviderOrder> {
    return Promise.reject(unavailable());
  }

  public async captureOrder(): Promise<ProviderCapture> {
    return Promise.reject(unavailable());
  }

  public async verifyWebhook(_input: PayPalWebhookVerificationInput): Promise<boolean> {
    return Promise.reject(unavailable());
  }
}

function unavailable(): PaymentGatewayError {
  return new PaymentGatewayError(
    'PAYMENT_GATEWAY_UNAVAILABLE',
    'Payment processing is not configured.',
    true,
  );
}
