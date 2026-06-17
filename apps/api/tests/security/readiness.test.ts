import { describe, expect, it } from 'vitest';

import { checkServices, type ServiceProbe } from '../../src/application/readiness.js';

describe('readiness diagnostics', () => {
  it('measures successful, disabled and failed probes without throwing', async () => {
    let measured = 0;
    const measure = () => {
      measured += 5;
      return measured;
    };
    const now = () => new Date('2026-06-17T15:00:00.000Z');
    const probes: readonly ServiceProbe[] = [
      {
        name: 'database',
        required: true,
        async run() {
          return { name: 'database', ok: true, required: true, state: 'ready' };
        },
      },
      {
        name: 'notifications',
        required: false,
        async run() {
          return { name: 'notifications', ok: true, required: false, state: 'disabled' };
        },
      },
      {
        name: 'payments',
        required: true,
        async run() {
          throw new Error('provider credentials must not leak');
        },
      },
    ];

    const report = await checkServices(probes, { now, measure });

    expect(report.ready).toBe(false);
    expect(report.generatedAt).toBe('2026-06-17T15:00:00.000Z');
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    expect(report.checks).toEqual([
      {
        name: 'database',
        ok: true,
        required: true,
        state: 'ready',
        checkedAt: '2026-06-17T15:00:00.000Z',
        latencyMs: 5,
      },
      {
        name: 'notifications',
        ok: true,
        required: false,
        state: 'disabled',
        checkedAt: '2026-06-17T15:00:00.000Z',
        latencyMs: 5,
      },
      {
        name: 'payments',
        ok: false,
        required: true,
        state: 'unavailable',
        checkedAt: '2026-06-17T15:00:00.000Z',
        latencyMs: 5,
      },
    ]);
    expect(JSON.stringify(report)).not.toContain('credentials must not leak');
  });

  it('uses a stable fallback name for anonymous failed probes', async () => {
    const report = await checkServices([
      {
        async run() {
          throw new Error('unavailable');
        },
      },
    ]);

    expect(report.checks[0]).toMatchObject({
      name: 'probe-1',
      ok: false,
      required: true,
      state: 'unavailable',
    });
  });
});
