import { describe, expect, it } from 'vitest';
import { siteContent } from '../src/content/site.js';

describe('public site foundation', () => {
  it('provides intentional positioning copy', () => {
    expect(siteContent.title).toBe('Carlos Pinto Digital Consulting');
    expect(siteContent.description.length).toBeGreaterThan(40);
  });
});
