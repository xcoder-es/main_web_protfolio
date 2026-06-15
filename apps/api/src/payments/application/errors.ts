export class PaymentApplicationError extends Error {
  public constructor(
    public readonly code:
      | 'PAYMENT_REQUEST_NOT_FOUND'
      | 'INVALID_PAYMENT_REQUEST'
      | 'INVALID_PAYMENT_TRANSITION'
      | 'PAYMENT_ORDER_MISMATCH'
      | 'PAYMENT_AMOUNT_MISMATCH'
      | 'PAYMENT_NOT_AVAILABLE'
      | 'PAYPAL_WEBHOOK_INVALID',
    message: string,
    public readonly statusCode: number,
    public readonly fieldErrors?: Readonly<Record<string, readonly string[]>>,
  ) {
    super(message);
    this.name = 'PaymentApplicationError';
  }
}
