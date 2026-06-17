import { describe, expect, it } from 'vitest';
import { getPageContent } from '../src/content/index.js';

describe('public site foundation', () => {
  it('provides intentional positioning copy', () => {
    const home = getPageContent('en', 'home');
    expect(home.title).toBe('Architecture, AI and product engineering for consequential work.');
    expect(home.description.length).toBeGreaterThan(40);
  });
});
