import { describe, expect, it } from 'vitest';

import { apiErrorSchema } from '../src/api.js';
import { contactSubmissionSchema } from '../src/forms.js';
import { paginationQuerySchema } from '../src/pagination.js';
import { moneySchema } from '../src/payments.js';

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
        message: 'I need help designing an AI platform architecture.',
        language: 'en',
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
});
