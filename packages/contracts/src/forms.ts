import { z } from 'zod';

export const languageSchema = z.enum(['en', 'es']);

export const contactSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(20).max(5000),
  language: languageSchema,
});

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;
