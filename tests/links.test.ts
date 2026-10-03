import { describe, expect, it } from 'vitest';
import { directionsUrl, tableMessage, waLink, waNumber } from '@/lib/links';
import { formatPrices } from '@/lib/format';

describe('WhatsApp links', () => {
  it('normalises the three branch numbers from the linktree', () => {
    expect(waNumber('+62 813-3777-2517')).toBe('6281337772517');
    expect(waNumber('+62 877-5974-3987')).toBe('6287759743987');
    expect(waNumber('+62 821-4645-2189')).toBe('6282146452189');
    expect(waNumber('0821 4645 2189')).toBe('6282146452189');
  });

  it('pre-fills and encodes the message', () => {
    const url = waLink('+62 821-4645-2189', tableMessage('Berawa', 4, '9am'));
    expect(url).toBe('https://wa.me/6282146452189?text=Hi%20Nourish%20Berawa%2C%20is%20there%20a%20table%20for%204%20at%209am%20today%3F');
  });
});

describe('directions', () => {
  it('uses the Maps URLs API with an encoded destination', () => {
    const url = new URL(directionsUrl({ query: 'NOURISH CAFE & PIZZERIA, Pecatu' }));
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('destination')).toBe('NOURISH CAFE & PIZZERIA, Pecatu');
  });

  it('adds the place id when known', () => {
    const url = new URL(directionsUrl({ query: 'x', placeId: 'ChIJabc' }));
    expect(url.searchParams.get('destination_place_id')).toBe('ChIJabc');
  });
});

describe('prices', () => {
  it('formats single, sized and labelled prices', () => {
    expect(formatPrices([{ amount: 85 }])).toBe('85K');
    expect(formatPrices([{ amount: 60 }, { amount: 85 }])).toBe('60K | 85K');
    expect(formatPrices([{ label: 'Seared tofu', amount: 95 }])).toBe('Seared tofu 95K');
  });
});
