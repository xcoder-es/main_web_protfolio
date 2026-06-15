import { z } from 'zod';

import { idempotencyKeySchema } from './identifiers.js';

export const languageSchema = z.enum(['en', 'es']);

export const submissionMetadataSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
  language: languageSchema,
  pageUrl: z.string().url().max(2048),
  startedAt: z.string().datetime({ offset: true }),
  consent: z.literal(true),
});

export const contactSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(40).optional(),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(20).max(5000),
  metadata: submissionMetadataSchema,
});

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;
