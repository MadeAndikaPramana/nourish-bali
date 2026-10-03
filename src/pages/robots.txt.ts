import type { APIRoute } from 'astro';
import { INDEXABLE } from '@/lib/site';

export const prerender = true;

/** Blocks every crawler until PUBLIC_INDEXABLE=true. /admin and /api are always off-limits. */
export const GET: APIRoute = ({ site }) => {
  const body = INDEXABLE
    ? `User-agent: *\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${new URL('/sitemap.xml', site)}\n`
    : `User-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
