import { englishPages } from './en';
import { spanishPages } from './es';
import type { Locale, PageContent, PageKey } from './site';

const registry: Readonly<Record<Locale, Readonly<Record<PageKey, PageContent>>>> = {
  en: englishPages,
  es: spanishPages,
};

export function getPageContent(locale: Locale, key: PageKey): PageContent {
  return registry[locale][key];
}

export { registry as pages };
