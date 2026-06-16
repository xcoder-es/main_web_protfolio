import type { APIRoute } from 'astro';

import { locales, pageKeys, routes } from '../content/site';

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321');
  const entries = locales.flatMap((locale) =>
    pageKeys.map((key) => new URL(routes[locale][key], origin).href),
  );
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((url) => `  <url><loc>${url}</loc></url>`),
    '</urlset>',
  ].join('\n');

  return new Response(body, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
