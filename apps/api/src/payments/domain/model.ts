export const paymentStatuses = [
  'draft',
  'active',
  'processing',
  'paid',
  'cancelled',
  'expired',
  'failed',
  'refunded',
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];
export type ProviderReference = Readonly<{ provider: 'paypal'; id: string }>;
export type Money = Readonly<{ amountMinor: number; currency: string }>;

const zeroDecimalCurrencies = new Set(['HUF', 'JPY', 'TWD']);
const transitions: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  draft: ['active', 'cancelled'],
  active: ['processing', 'cancelled', 'expired'],
  processing: ['paid', 'failed', 'cancelled', 'expired'],
  paid: ['refunded'],
  cancelled: [],
  expired: [],
  failed: ['active', 'cancelled'],
  refunded: [],
};

export class PaymentDomainError extends Error {
  public constructor(
    public readonly code:
      | 'INVALID_MONEY'
      | 'INVALID_PAYMENT_TRANSITION'
      | 'PAYMENT_AMOUNT_MISMATCH',
    message: string,
  ) {
    super(message);
    this.name = 'PaymentDomainError';
  }
}

export function createMoney(amountMinor: number, currency: string): Money {
  const normalizedCurrency = currency.trim().toUpperCase();
  if (
    !Number.isSafeInteger(amountMinor) ||
    amountMinor <= 0 ||
    !/^[A-Z]{3}$/.test(normalizedCurrency)
  ) {
    throw new PaymentDomainError('INVALID_MONEY', 'Payment money is invalid.');
  }
  return { amountMinor, currency: normalizedCurrency };
}

export function moneyEquals(left: Money, right: Money): boolean {
  return left.amountMinor === right.amountMinor && left.currency === right.currency;
}

export function toPayPalAmount(money: Money): string {
  const decimals = zeroDecimalCurrencies.has(money.currency) ? 0 : 2;
  if (decimals === 0) return String(money.amountMinor);
  return `${Math.floor(money.amountMinor / 100)}.${String(money.amountMinor % 100).padStart(2, '0')}`;
}

export function fromPayPalAmount(value: string, currency: string): Money {
  const normalizedCurrency = currency.trim().toUpperCase();
  const decimals = zeroDecimalCurrencies.has(normalizedCurrency) ? 0 : 2;
  const pattern = decimals === 0 ? /^\d+$/ : /^\d+\.\d{2}$/;
  if (!pattern.test(value)) {
    throw new PaymentDomainError('INVALID_MONEY', 'PayPal amount format is invalid.');
  }
  const amountMinor = decimals === 0 ? Number(value) : Number(value.replace('.', ''));
  return createMoney(amountMinor, normalizedCurrency);
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (from === to) return;
  if (!transitions[from].includes(to)) {
    throw new PaymentDomainError(
      'INVALID_PAYMENT_TRANSITION',
      `Payment status cannot change from ${from} to ${to}.`,
    );
  }
}
