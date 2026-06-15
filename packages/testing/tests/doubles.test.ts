import { describe, expect, it } from 'vitest';

import { MutableClock } from '../src/clock.js';
import { SequenceIdGenerator } from '../src/id-generator.js';
import { MemoryLogger } from '../src/logger.js';

describe('deterministic test doubles', () => {
  it('controls time without sharing mutable Date instances', () => {
    const clock = new MutableClock(new Date('2026-06-15T12:00:00.000Z'));
    clock.advance(1_000);
    expect(clock.now().toISOString()).toBe('2026-06-15T12:00:01.000Z');
  });

  it('returns IDs in a deterministic sequence', () => {
    const ids = new SequenceIdGenerator(['first', 'second']);
    expect(ids.generate()).toBe('first');
    expect(ids.generate()).toBe('second');
    expect(() => ids.generate()).toThrow('No generated IDs remain');
  });

  it('captures structured log entries', () => {
    const logger = new MemoryLogger();
    logger.info('lead accepted', { correlationId: 'correlation-1' });
    expect(logger.entries).toEqual([
      {
        level: 'info',
        message: 'lead accepted',
        context: { correlationId: 'correlation-1' },
      },
    ]);
  });
});
