import type { Branch } from './schema';
import { WEEKDAY_NAMES } from './hours';
import { waNumber } from './links';

/**
 * schema.org data for a branch. Opening hours are only published once the owner confirms them,
 * and no review markup is added (Google ignores self-served ratings for local businesses).
 */
export function branchJsonLd(b: Branch, site: URL) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: `NOURISH ${b.name}`,
    url: new URL(`/${b.slug}`, site).href,
    telephone: `+${waNumber(b.whatsapp)}`,
    servesCuisine: ['Healthy', 'Breakfast', 'Cafe'],
    address: {
      '@type': 'PostalAddress',
      streetAddress: b.address.split(',')[0],
      addressLocality: b.area,
      addressRegion: 'Bali',
      addressCountry: 'ID',
    },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.maps.query)}`,
    menu: new URL(`/${b.slug}#menu`, site).href,
  };
  if (b.hoursConfirmed) {
    data.openingHoursSpecification = Object.entries(b.hours).flatMap(([day, ranges]) =>
      ranges.map((r) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: WEEKDAY_NAMES[day as keyof typeof WEEKDAY_NAMES],
        opens: r.open,
        closes: r.close,
      })),
    );
  }
  return data;
}
