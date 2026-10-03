import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Branch, CONTENT_PATHS, ContentBundle, Menu, Site, toJson } from '@/lib/schema';

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

describe('content files', () => {
  const bundle = {
    site: read(CONTENT_PATHS.site),
    branches: Object.fromEntries(Object.entries(CONTENT_PATHS.branches).map(([k, p]) => [k, read(p)])),
    menus: Object.fromEntries(Object.entries(CONTENT_PATHS.menus).map(([k, p]) => [k, read(p)])),
  };

  it('match the schema /admin validates against', () => {
    expect(() => ContentBundle.parse(bundle)).not.toThrow();
  });

  it('are formatted exactly like admin writes them (no noisy diffs on first save)', () => {
    for (const p of [CONTENT_PATHS.site, ...Object.values(CONTENT_PATHS.branches), ...Object.values(CONTENT_PATHS.menus)]) {
      expect(toJson(read(p))).toBe(readFileSync(p, 'utf8'));
    }
  });

  it('survive a parse → write round trip unchanged (schema key order matches the files)', () => {
    const parsed = ContentBundle.parse(bundle);
    expect(toJson(parsed.site)).toBe(readFileSync(CONTENT_PATHS.site, 'utf8'));
    for (const [k, p] of Object.entries(CONTENT_PATHS.branches)) expect(toJson(parsed.branches[k as keyof typeof parsed.branches])).toBe(readFileSync(p, 'utf8'));
    for (const [k, p] of Object.entries(CONTENT_PATHS.menus)) expect(toJson(parsed.menus[k as keyof typeof parsed.menus])).toBe(readFileSync(p, 'utf8'));
  });

  it('keep the demo honest: prices are flagged as samples and hours as unconfirmed', () => {
    for (const m of Object.values(bundle.menus)) expect(Menu.parse(m).samplePrices).toBe(true);
    for (const b of Object.values(bundle.branches)) expect(Branch.parse(b).hoursConfirmed).toBe(false);
    expect(Site.parse(bundle.site).instagram).toBe('nourishbali');
  });

  it('branch WhatsApp numbers match the brief', () => {
    const wa = Object.fromEntries(Object.entries(bundle.branches).map(([k, b]) => [k, (b as { whatsapp: string }).whatsapp]));
    expect(wa).toEqual({ uluwatu: '+62 813-3777-2517', ungasan: '+62 877-5974-3987', berawa: '+62 821-4645-2189' });
  });

  it('Berawa has no pizza or bakery; the Bukit menu does', () => {
    const ids = (m: string) => (bundle.menus[m] as Menu).categories.map((c) => c.id);
    expect(ids('berawa')).not.toContain('pizza');
    expect(ids('berawa')).not.toContain('bakery');
    expect(ids('bukit')).toEqual(expect.arrayContaining(['pizza', 'bakery']));
  });
});
