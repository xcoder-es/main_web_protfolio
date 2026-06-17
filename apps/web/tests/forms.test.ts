import { readFile } from 'node:fs/promises';

import { contactSubmissionSchema, projectRequestSubmissionSchema } from '@carlos-pinto/contracts';
import { describe, expect, it } from 'vitest';

const validMetadata = {
  idempotencyKey: '00000000-0000-4000-8000-000000000001',
  language: 'en' as const,
  pageUrl: 'https://portfolio.example.com/contact',
  startedAt: '2026-06-17T11:58:00.000Z',
  consent: true as const,
};

describe('public lead forms', () => {
  it('shares the server submission schemas with the browser controller', () => {
    expect(
      contactSubmissionSchema.safeParse({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        subject: 'Architecture advisory',
        message: 'We need architecture guidance for a complex platform modernisation.',
        metadata: validMetadata,
        antiSpam: { website: '', turnstileToken: 'challenge-token' },
      }).success,
    ).toBe(true);

    expect(
      projectRequestSubmissionSchema.safeParse({
        name: 'Grace Hopper',
        email: 'grace@example.com',
        company: 'Compiler Labs',
        projectType: 'ai-engineering',
        summary:
          'We need a governed AI product with evaluation, observability and clear operational controls.',
        budgetRange: '15k-50k',
        timeline: 'one-to-three-months',
        metadata: { ...validMetadata, pageUrl: 'https://portfolio.example.com/request-a-project' },
        antiSpam: { website: '', turnstileToken: 'challenge-token' },
      }).success,
    ).toBe(true);
  });

  it('renders labels, live status, consent, honeypot and optional Turnstile markup', async () => {
    const component = await readFile(
      new URL('../src/components/LeadForm.astro', import.meta.url),
      'utf8',
    );

    expect(component).toContain('data-lead-form');
    expect(component).toContain('data-form-status');
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain('name="consent"');
    expect(component).toContain('name="website"');
    expect(component).toContain('cf-turnstile');
    expect(component).toContain('data-field-error');
  });

  it('wakes the API once and retains an idempotency key across retries', async () => {
    const controller = await readFile(
      new URL('../src/scripts/lead-form.ts', import.meta.url),
      'utf8',
    );

    expect(controller).toContain("form.addEventListener('focusin', wake, { once: true })");
    expect(controller).toContain('/api/public/status');
    expect(controller).not.toContain('setInterval');
    expect(controller).toContain('let idempotencyKey = createIdempotencyKey()');
    expect(controller).toContain('idempotencyKey = createIdempotencyKey()');
  });
});
