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

export const antiSpamSubmissionSchema = z.object({
  website: z.string().max(200).optional(),
  turnstileToken: z.string().trim().min(1).max(2048).optional(),
});

export const contactSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(40).optional(),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(20).max(5000),
  metadata: submissionMetadataSchema,
  antiSpam: antiSpamSubmissionSchema.optional(),
});

export const projectTypeSchema = z.enum([
  'technology-advisory',
  'solution-architecture',
  'ai-engineering',
  'product-engineering',
  'fractional-leadership',
  'other',
]);

export const projectRequestSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  company: z.string().trim().min(2).max(160).optional(),
  projectType: projectTypeSchema,
  summary: z.string().trim().min(30).max(8000),
  budgetRange: z.enum(['under-5k', '5k-15k', '15k-50k', '50k-plus', 'discuss']),
  timeline: z.enum(['urgent', 'one-to-three-months', 'three-to-six-months', 'flexible']),
  metadata: submissionMetadataSchema,
  antiSpam: antiSpamSubmissionSchema.optional(),
});

export type AntiSpamSubmission = z.infer<typeof antiSpamSubmissionSchema>;
export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;
export type ProjectRequestSubmission = z.infer<typeof projectRequestSubmissionSchema>;
