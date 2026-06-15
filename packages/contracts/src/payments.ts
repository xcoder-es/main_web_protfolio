import { z } from 'zod';

import { leadIdSchema, paymentRequestIdSchema } from './identifiers.js';

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

export const createPaymentRequestSchema = z.object({
  leadId: leadIdSchema.optional(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional(),
  money: moneySchema,
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

export const paymentRequestSchema = createPaymentRequestSchema.extend({
  id: paymentRequestIdSchema,
  status: paymentStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type Currency = z.infer<typeof currencySchema>;
export type Money = z.infer<typeof moneySchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type CreatePaymentRequest = z.infer<typeof createPaymentRequestSchema>;
export type PaymentRequest = z.infer<typeof paymentRequestSchema>;
