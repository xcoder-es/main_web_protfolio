import { describe, expect, it } from 'vitest';
import { getPageContent } from '../src/content/index.js';

describe('public site foundation', () => {
  it('provides intentional positioning copy', () => {
    const home = getPageContent('en', 'home');
    expect(home.title).toBe('Clearer technology decisions. Stronger systems. Practical AI.');
    expect(home.description.length).toBeGreaterThan(40);
  });
});
