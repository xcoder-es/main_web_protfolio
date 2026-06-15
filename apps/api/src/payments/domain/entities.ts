import type { Money, PaymentStatus, ProviderReference } from './model.js';

export type PaymentRequest = Readonly<{
  id: string;
  publicToken: string;
  leadId?: string;
  title: string;
  description?: string;
  money: Money;
  status: PaymentStatus;
  providerOrder?: ProviderReference;
  expiresAt?: Date;
  paidAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}>;

export type PaymentEvent = Readonly<{
  id: string;
  paymentRequestId: string;
  type: string;
  provider?: ProviderReference;
  occurredAt: Date;
  metadata: Readonly<Record<string, unknown>>;
}>;
