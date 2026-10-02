import type { APIRoute } from 'astro';
import { getBranches, menuForBranch } from '@/lib/content';

export const prerender = true;

export interface SearchEntry {
  /** dish name */
  n: string;
  /** category */
  c: string;
  /** dietary tags */
  t: string[];
  /** where to find it: branch slug + item anchor */
  at: { b: string; name: string; id: string }[];
}

/** Small dish index for the ⌘K search, fetched lazily on first open. */
export const GET: APIRoute = () => {
  const byName = new Map<string, SearchEntry>();
  for (const branch of getBranches()) {
    for (const cat of menuForBranch(branch.slug).categories) {
      for (const item of cat.items) {
        const key = item.name.toLowerCase();
        const entry = byName.get(key) ?? { n: item.name, c: cat.name, t: item.tags, at: [] };
        // Same dish listed twice on one menu (e.g. the protein scoop): link the first occurrence only.
        if (!entry.at.some((a) => a.b === branch.slug)) entry.at.push({ b: branch.slug, name: branch.name, id: item.id });
        byName.set(key, entry);
      }
    }
  }
  return new Response(JSON.stringify([...byName.values()]), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
