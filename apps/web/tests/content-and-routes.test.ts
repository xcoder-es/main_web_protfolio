import { describe, expect, it } from 'vitest';

import { pages } from '../src/content';
import { chrome, locales, pageKeys, routes } from '../src/content/site';

describe('bilingual public website', () => {
  it('provides the same complete page set in English and Spanish', () => {
    for (const locale of locales) {
      expect(Object.keys(pages[locale]).sort()).toEqual([...pageKeys].sort());
      expect(Object.keys(routes[locale]).sort()).toEqual([...pageKeys].sort());
    }
  });

  it('uses unique, locale-correct static routes', () => {
    const allRoutes = locales.flatMap((locale) => Object.values(routes[locale]));
    expect(new Set(allRoutes).size).toBe(allRoutes.length);
    expect(routes.en.home).toBe('/');
    expect(routes.es.home).toBe('/es');
    expect(Object.values(routes.en).every((path) => !path.startsWith('/es'))).toBe(true);
    expect(
      Object.values(routes.es).every((path) => path === '/es' || path.startsWith('/es/')),
    ).toBe(true);
  });

  it('keeps metadata and editorial content substantive', () => {
    for (const locale of locales) {
      for (const pageKey of pageKeys) {
        const page = pages[locale][pageKey];
        expect(page.title.length).toBeGreaterThan(12);
        expect(page.description.length).toBeGreaterThan(45);
        expect(page.lead.length).toBeGreaterThan(45);
        expect(page.sections.length).toBeGreaterThan(0);
        expect(page.sections.every((section) => section.title.trim().length > 0)).toBe(true);
      }
    }
  });

  it('keeps internal calls to action inside the localized route graph', () => {
    for (const locale of locales) {
      const localizedRoutes = new Set(Object.values(routes[locale]));
      for (const pageKey of pageKeys) {
        const page = pages[locale][pageKey];
        const links = [
          page.primaryAction?.href,
          page.secondaryAction?.href,
          ...page.sections.flatMap((section) => section.items?.map((item) => item.href) ?? []),
        ].filter((href): href is string => Boolean(href));

        for (const href of links) {
          if (href.startsWith('/')) expect(localizedRoutes.has(href)).toBe(true);
        }
      }
    }
  });

  it('exposes localized navigation and direct project actions', () => {
    expect(chrome.en.requestProject).not.toBe(chrome.es.requestProject);
    expect(pages.en.contact.primaryAction?.href).toBe('mailto:capintobe@gmail.com');
    expect(pages.es.contact.secondaryAction?.href).toContain('wa.me/34625038287');
  });
});
