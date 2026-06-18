export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];

export const pageKeys = [
  'home',
  'services',
  'work',
  'caseStudies',
  'about',
  'contact',
  'requestProject',
  'payment',
  'privacy',
  'terms',
] as const;
export type PageKey = (typeof pageKeys)[number];

export type ContentItem = Readonly<{
  title: string;
  body: string;
  meta?: string;
  href?: string;
}>;

export type ContentSection = Readonly<{
  eyebrow?: string;
  title: string;
  body?: readonly string[];
  items?: readonly ContentItem[];
}>;

export type PageContent = Readonly<{
  title: string;
  description: string;
  eyebrow: string;
  lead: string;
  sections: readonly ContentSection[];
  primaryAction?: Readonly<{ label: string; href: string }>;
  secondaryAction?: Readonly<{ label: string; href: string }>;
}>;

export const routes: Readonly<Record<Locale, Readonly<Record<PageKey, string>>>> = {
  en: {
    home: '/',
    services: '/services',
    work: '/work',
    caseStudies: '/case-studies',
    about: '/about',
    contact: '/contact',
    requestProject: '/request-a-project',
    payment: '/payment',
    privacy: '/privacy',
    terms: '/terms',
  },
  es: {
    home: '/es',
    services: '/es/servicios',
    work: '/es/trabajo',
    caseStudies: '/es/casos-de-estudio',
    about: '/es/sobre-mi',
    contact: '/es/contacto',
    requestProject: '/es/solicitar-proyecto',
    payment: '/es/pago',
    privacy: '/es/privacidad',
    terms: '/es/terminos',
  },
};

export const site = {
  name: 'Carlos Pinto',
  descriptor: 'Architecture · AI · Product Engineering',
  email: 'capintobe@gmail.com',
  phoneDisplay: '+34 625 038 287',
  phoneHref: 'tel:+34625038287',
  whatsappHref: 'https://wa.me/34625038287',
  githubHref: 'https://github.com/xcoder-es',
  linkedinHref: 'https://www.linkedin.com/in/carlosalfredopinto',
  location: 'Madrid, Spain',
} as const;

export const siteContent = {
  title: 'Carlos Pinto Digital Consulting',
  description:
    'Independent digital consulting for architecture, AI and product engineering teams that need senior execution without ceremony.',
} as const;

export const chrome = {
  en: {
    skip: 'Skip to content',
    menu: 'Menu',
    close: 'Close menu',
    language: 'Español',
    availability: 'Available for selected architecture, AI and product engagements.',
    nav: {
      services: 'Services',
      work: 'Work',
      caseStudies: 'Case studies',
      about: 'About',
      contact: 'Contact',
    },
    requestProject: 'Request a project',
    footerTitle: 'Build the right system, not the loudest one.',
    footerBody:
      'Independent senior technology advisory and hands-on delivery for teams navigating complex change.',
    legal: 'Independent digital consulting. All rights reserved.',
  },
  es: {
    skip: 'Saltar al contenido',
    menu: 'Menú',
    close: 'Cerrar menú',
    language: 'English',
    availability: 'Disponible para proyectos selectos de arquitectura, IA y producto.',
    nav: {
      services: 'Servicios',
      work: 'Trabajo',
      caseStudies: 'Casos',
      about: 'Sobre mí',
      contact: 'Contacto',
    },
    requestProject: 'Solicitar proyecto',
    footerTitle: 'Construir el sistema correcto, no el más ruidoso.',
    footerBody:
      'Asesoría tecnológica senior y ejecución práctica para equipos que enfrentan cambios complejos.',
    legal: 'Consultoría digital independiente. Todos los derechos reservados.',
  },
} as const;

export function pageKeyFromPath(locale: Locale, pathname: string): PageKey | undefined {
  return pageKeys.find((key) => routes[locale][key] === pathname);
}

export function alternatePath(locale: Locale, key: PageKey): string {
  return routes[locale === 'en' ? 'es' : 'en'][key];
}
