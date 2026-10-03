import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CONTENT_PATHS, type ContentBundle } from '@/lib/schema';
import { commitMessage, describeChanges } from '@/lib/diff';

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const load = (): ContentBundle => ({
  site: read(CONTENT_PATHS.site),
  branches: Object.fromEntries(Object.entries(CONTENT_PATHS.branches).map(([k, p]) => [k, read(p)])) as ContentBundle['branches'],
  menus: Object.fromEntries(Object.entries(CONTENT_PATHS.menus).map(([k, p]) => [k, read(p)])) as ContentBundle['menus'],
});

describe('describeChanges', () => {
  it('is empty when nothing changed', () => {
    expect(describeChanges(load(), load())).toEqual([]);
  });

  it('describes hours, prices, sold-out and new items in plain words', () => {
    const a = load();
    const b = load();
    b.branches.berawa.hours.sun = [{ open: '07:00', close: '21:00' }];
    b.branches.ungasan.specialDays.push({ date: '2027-03-09', label: 'Nyepi', hours: [] });
    const poke = b.menus.bukit.categories.find((c) => c.id === 'bigger-stuff')!.items.find((i) => i.id === 'poke-bowl')!;
    poke.prices[0].amount = 999;
    poke.soldOut = true;
    b.menus.berawa.categories[0].items.push({ id: 'new-dish', name: 'New Dish', tags: ['V'], prices: [{ amount: 70 }] });

    const changes = describeChanges(a, b);
    expect(changes).toContain('Berawa · Sunday: 6am–9pm → 7am–9pm');
    expect(changes).toContain('Ungasan · added special day 2027-03-09 (Nyepi): closed');
    expect(changes.some((c) => /^Uluwatu & Ungasan menu · Poke Bowl · Sashimi tuna: \d+K → 999K$/.test(c))).toBe(true);
    expect(changes).toContain('Uluwatu & Ungasan menu · Poke Bowl: sold out');
    expect(changes).toContain('Berawa menu · added “New Dish” to All Day Breakfast (70K)');
  });

  it('builds a short subject with the full list in the body', () => {
    const msg = commitMessage(['A', 'B', 'C']);
    expect(msg.split('\n')[0]).toBe('admin: A (+2 more)');
    expect(msg).toContain('- C');
  });
});
