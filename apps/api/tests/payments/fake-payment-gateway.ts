import type { Money } from '../../src/payments/domain/model.js';
import type {
  PayPalWebhookVerificationInput,
  PaymentGateway,
  ProviderCapture,
  ProviderOrder,
} from '../../src/payments/application/ports.js';

export class FakePaymentGateway implements PaymentGateway {
  public createCalls: Parameters<PaymentGateway['createOrder']>[0][] = [];
  public captureCalls: Parameters<PaymentGateway['captureOrder']>[0][] = [];
  public verificationCalls: PayPalWebhookVerificationInput[] = [];
  public verified = true;
  public captureStatus: ProviderCapture['status'] = 'COMPLETED';
  public captureMoney?: Money;

  public async createOrder(
    input: Parameters<PaymentGateway['createOrder']>[0],
  ): Promise<ProviderOrder> {
    this.createCalls.push(input);
    return {
      orderId: 'ORDER-123',
      status: 'CREATED',
      approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER-123',
    };
  }

  public async captureOrder(
    input: Parameters<PaymentGateway['captureOrder']>[0],
  ): Promise<ProviderCapture> {
    this.captureCalls.push(input);
    return {
      orderId: input.orderId,
      captureId: 'CAPTURE-123',
      status: this.captureStatus,
      money: this.captureMoney ?? { amountMinor: 12500, currency: 'EUR' },
    };
  }

  public async verifyWebhook(input: PayPalWebhookVerificationInput): Promise<boolean> {
    this.verificationCalls.push(input);
    return this.verified;
  }
}
