import type { APIRoute } from 'astro';
import { BRANCH_SLUGS } from '@/lib/schema';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const urls = ['/', '/menu', ...BRANCH_SLUGS.map((s) => `/${s}`)].map((p) => `<url><loc>${new URL(p, site)}</loc></url>`);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
