import { describe, expect, it } from 'vitest';

import { emailSchema } from '../src/schema.js';

describe('contract package exports', () => {
  it('provides reusable schemas', () => {
    expect(emailSchema.parse('carlos@example.com')).toBe('carlos@example.com');
  });
});
