import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321');
  const sitemap = new URL('/sitemap.xml', origin).href;
  return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${sitemap}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
