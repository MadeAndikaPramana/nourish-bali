// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// Pages are prerendered; only /api/admin/* opts out with `prerender = false`.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://nourish-bali.vercel.app',
  output: 'static',
  adapter: vercel(),
  integrations: [react()],
  // Astro 7 defaults to JSX-style whitespace stripping, which eats spaces between inline elements in copy.
  compressHTML: true,
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  build: { format: 'directory' },
  vite: {
    plugins: [tailwindcss()],
  },
});
