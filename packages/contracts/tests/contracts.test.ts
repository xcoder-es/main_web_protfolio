import { describe, expect, it } from 'vitest';

import { apiErrorSchema } from '../src/api.js';
import { contactSubmissionSchema, projectRequestSubmissionSchema } from '../src/forms.js';
import { paginationQuerySchema } from '../src/pagination.js';
import { createPaymentRequestSchema, moneySchema } from '../src/payments.js';

const metadata = {
  idempotencyKey: 'contact-request-0001',
  language: 'en' as const,
  pageUrl: 'https://example.com/contact',
  startedAt: '2026-06-15T12:00:00.000Z',
  consent: true as const,
};

describe('shared contracts', () => {
  it('normalises pagination input and applies limits', () => {
    expect(paginationQuerySchema.parse({ page: '2', pageSize: '50' })).toMatchObject({
      page: 2,
      pageSize: 50,
      sortDirection: 'desc',
    });
    expect(() => paginationQuerySchema.parse({ page: 1, pageSize: 101 })).toThrow();
  });

  it('rejects malformed API errors', () => {
    expect(() =>
      apiErrorSchema.parse({ code: 'bad code', message: '', correlationId: 'short' }),
    ).toThrow();
  });

  it('validates public contact submissions', () => {
    expect(
      contactSubmissionSchema.parse({
        name: 'Carlos Pinto',
        email: 'carlos@example.com',
        subject: 'Architecture advisory',
        message: 'I need help designing an AI platform architecture.',
        metadata,
      }),
    ).toBeDefined();
  });

  it('validates structured project requests', () => {
    expect(
      projectRequestSubmissionSchema.parse({
        name: 'Carlos Pinto',
        email: 'carlos@example.com',
        projectType: 'ai-engineering',
        summary: 'Build a production-grade AI consulting intake and operations platform.',
        budgetRange: 'discuss',
        timeline: 'flexible',
        metadata: { ...metadata, idempotencyKey: 'project-request-0001' },
      }),
    ).toBeDefined();
  });

  it('uses positive integer minor units for money', () => {
    expect(moneySchema.parse({ amountMinor: 125000, currency: 'EUR' })).toEqual({
      amountMinor: 125000,
      currency: 'EUR',
    });
    expect(() => moneySchema.parse({ amountMinor: 12.5, currency: 'EUR' })).toThrow();
  });

  it('rejects browser-controlled payment amounts outside the DTO', () => {
    expect(() =>
      createPaymentRequestSchema.parse({
        title: 'Architecture engagement',
        money: { amountMinor: 0, currency: 'EUR' },
      }),
    ).toThrow();
  });
});
