import { z } from 'zod';

export const currencySchema = z.enum(['EUR', 'USD', 'GBP']);

export const moneySchema = z.object({
  amountMinor: z.number().int().positive(),
  currency: currencySchema,
});

export const paymentStatusSchema = z.enum([
  'draft',
  'active',
  'processing',
  'paid',
  'cancelled',
  'expired',
  'failed',
  'refunded',
]);

export type Currency = z.infer<typeof currencySchema>;
export type Money = z.infer<typeof moneySchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
