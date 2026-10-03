/**
 * Go-live switches. Both are read at build time from Vercel env vars.
 * - PUBLIC_INDEXABLE=true lets search engines in (meta robots + robots.txt). Default: blocked.
 * - PUBLIC_CONCEPT=false removes the "concept, not affiliated" notices once NOURISH owns the site.
 */
export const INDEXABLE = import.meta.env.PUBLIC_INDEXABLE === 'true';
export const IS_CONCEPT = import.meta.env.PUBLIC_CONCEPT !== 'false';

export const SITE_NAME = 'NOURISH Bali';
export const CONCEPT_NOTICE = 'Concept site, not affiliated with NOURISH. Photos are placeholders and prices are samples.';
