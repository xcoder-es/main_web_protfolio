import { englishPages } from './en';
import { spanishPages } from './es';
import type { Locale, PageContent, PageKey } from './site';

const registry: Readonly<Record<Locale, Readonly<Record<PageKey, PageContent>>>> = {
  en: englishPages,
  es: spanishPages,
};

export function getPageContent(locale: Locale, key: PageKey): PageContent {
  const page = registry[locale][key];
  if (key === 'contact') {
    return {
      ...page,
      primaryAction: {
        label: locale === 'en' ? 'Use the secure form' : 'Usar el formulario seguro',
        href: '#contact-form-title',
      },
    };
  }
  if (key === 'requestProject') {
    return {
      ...page,
      lead:
        locale === 'en'
          ? 'Use the secure form below to share the outcome, current state, timing and commercial context. The same request can be retried safely without creating duplicates.'
          : 'Usa el formulario seguro para compartir el resultado, el estado actual, el plazo y el contexto comercial. La misma solicitud puede reintentarse sin crear duplicados.',
      primaryAction: {
        label: locale === 'en' ? 'Start the secure request' : 'Iniciar solicitud segura',
        href: '#project-form-title',
      },
    };
  }
  return page;
}

export { registry as pages };
