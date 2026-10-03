import type { Branch } from './schema';

/** "+62 813-3777-2517" or "0813 3777 2517" → "6281337772517" (wa.me wants country code, digits only). */
export function waNumber(display: string): string {
  const digits = display.replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

export function waLink(display: string, text?: string): string {
  const base = `https://wa.me/${waNumber(display)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export const tableMessage = (branchName: string, people: number, time: string, day = 'today') =>
  `Hi Nourish ${branchName}, is there a table for ${people} at ${time} ${day}?`;

export const helloMessage = (branchName: string) => `Hi Nourish ${branchName}, `;

/** Google Maps URLs API: opens turn-by-turn in the app on phones, Maps on desktop. */
export function directionsUrl(maps: Branch['maps']): string {
  const params = new URLSearchParams({ api: '1', destination: maps.query });
  if (maps.placeId) params.set('destination_place_id', maps.placeId);
  return `https://www.google.com/maps/dir/?${params}`;
}

export function mapsSearchUrl(maps: Branch['maps']): string {
  const params = new URLSearchParams({ api: '1', query: maps.query });
  if (maps.placeId) params.set('query_place_id', maps.placeId);
  return `https://www.google.com/maps/search/?${params}`;
}

/** Keyless embed. Swap for the Maps Embed API (with a key + place id) at go-live. */
export const mapEmbedUrl = (maps: Branch['maps']) =>
  `https://www.google.com/maps?q=${encodeURIComponent(maps.query)}&output=embed`;

export const instagramUrl = (handle: string) => `https://www.instagram.com/${handle}/`;
export const facebookUrl = (handle: string) => `https://www.facebook.com/${handle}`;
