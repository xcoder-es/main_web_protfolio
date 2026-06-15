import { z } from 'zod';

export const correlationIdSchema = z.string().min(8).max(128);
export type CorrelationId = z.infer<typeof correlationIdSchema>;

export const leadIdSchema = z.string().uuid();
export type LeadId = z.infer<typeof leadIdSchema>;

export const paymentRequestIdSchema = z.string().uuid();
export type PaymentRequestId = z.infer<typeof paymentRequestIdSchema>;

export const idempotencyKeySchema = z.string().min(16).max(128);
export type IdempotencyKey = z.infer<typeof idempotencyKeySchema>;
