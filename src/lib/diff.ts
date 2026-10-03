import { WEEKDAYS, type Branch, type ContentBundle, type Menu, type MenuItem, type Price } from './schema';
import { WEEKDAY_NAMES, formatRange } from './hours';
import { formatPrices } from './format';

/**
 * Human-readable list of what changed between two content bundles, e.g.
 * "Berawa · Sunday: 6am–9pm → 7am–9pm" or "Uluwatu & Ungasan menu · Poke Bowl: price 135K → 140K".
 * Shown in the admin's save dialog and used as the commit message.
 */
export function describeChanges(a: ContentBundle, b: ContentBundle): string[] {
  const out: string[] = [];
  const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);

  // Site
  const sa = a.site.announcement;
  const sb = b.site.announcement;
  if (sa.active !== sb.active) out.push(`Announcement ${sb.active ? 'turned on' : 'turned off'}`);
  if (sa.text !== sb.text) out.push(`Announcement text: “${sb.text || '(empty)'}”`);
  if ((sa.link ?? '') !== (sb.link ?? '')) out.push(`Announcement link: ${sb.link || '(none)'}`);
  if ((sa.start ?? '') !== (sb.start ?? '') || (sa.end ?? '') !== (sb.end ?? '')) out.push(`Announcement dates: ${sb.start || '…'} to ${sb.end || '…'}`);
  for (const k of ['instagram', 'facebook', 'tagline'] as const) if (a.site[k] !== b.site[k]) out.push(`Site ${k}: ${a.site[k]} → ${b.site[k]}`);

  // Branches
  for (const slug of Object.keys(b.branches) as (keyof ContentBundle['branches'])[]) {
    const x = a.branches[slug];
    const y = b.branches[slug];
    out.push(...branchChanges(x, y, same));
  }

  // Menus
  for (const id of Object.keys(b.menus) as (keyof ContentBundle['menus'])[]) out.push(...menuChanges(a.menus[id], b.menus[id], same));

  return out;
}

const day = (ranges: Branch['hours']['mon']) => (ranges.length ? ranges.map(formatRange).join(', ') : 'closed');

function branchChanges(x: Branch, y: Branch, same: (a: unknown, b: unknown) => boolean): string[] {
  const out: string[] = [];
  const n = y.name;
  for (const d of WEEKDAYS) if (!same(x.hours[d], y.hours[d])) out.push(`${n} · ${WEEKDAY_NAMES[d]}: ${day(x.hours[d])} → ${day(y.hours[d])}`);
  if (x.hoursConfirmed !== y.hoursConfirmed) out.push(`${n} · hours marked as ${y.hoursConfirmed ? 'confirmed' : 'unconfirmed'}`);
  const xd = new Map(x.specialDays.map((s) => [s.date, s]));
  const yd = new Map(y.specialDays.map((s) => [s.date, s]));
  for (const [date, s] of yd) {
    const old = xd.get(date);
    if (!old) out.push(`${n} · added special day ${date} (${s.label}): ${day(s.hours)}`);
    else if (!same(old, s)) out.push(`${n} · special day ${date}: ${old.label}, ${day(old.hours)} → ${s.label}, ${day(s.hours)}`);
  }
  for (const [date, s] of xd) if (!yd.has(date)) out.push(`${n} · removed special day ${date} (${s.label})`);
  if (!same(x.temporarilyClosed, y.temporarilyClosed)) {
    out.push(y.temporarilyClosed.active ? `${n} · temporarily closed${y.temporarilyClosed.message ? `: ${y.temporarilyClosed.message}` : ''}` : `${n} · reopened`);
  }
  const fields: [keyof Branch, string][] = [
    ['name', 'name'],
    ['mapsName', 'Maps name'],
    ['tagline', 'tagline'],
    ['area', 'area'],
    ['address', 'address'],
    ['whatsapp', 'WhatsApp'],
  ];
  for (const [k, label] of fields) if (x[k] !== y[k]) out.push(`${n} · ${label}: ${String(x[k])} → ${String(y[k])}`);
  if (!same(x.maps, y.maps)) out.push(`${n} · map location updated`);
  if (!same(x.rating, y.rating)) out.push(`${n} · Google rating: ${x.rating.value} (${x.rating.count}) → ${y.rating.value} (${y.rating.count})`);
  return out;
}

const price = (p: Price[]) => formatPrices(p);

function menuChanges(x: Menu, y: Menu, same: (a: unknown, b: unknown) => boolean): string[] {
  const out: string[] = [];
  const m = y.title.replace(/ menu$/i, '') + ' menu';
  if (x.samplePrices !== y.samplePrices) out.push(`${m} · prices ${y.samplePrices ? 'marked as samples' : 'marked as real'}`);
  for (const k of ['taxNote', 'allergenNote', 'paymentNote', 'title'] as const) if (x[k] !== y[k]) out.push(`${m} · ${k} updated`);

  const xc = new Map(x.categories.map((c) => [c.id, c]));
  const yc = new Map(y.categories.map((c) => [c.id, c]));
  for (const c of y.categories) if (!xc.has(c.id)) out.push(`${m} · added category “${c.name}” (${c.items.length} items)`);
  for (const c of x.categories) if (!yc.has(c.id)) out.push(`${m} · removed category “${c.name}”`);
  const commonOrder = (ids: string[], keep: Map<string, unknown>) => ids.filter((id) => keep.has(id));
  if (!same(commonOrder(x.categories.map((c) => c.id), yc), commonOrder(y.categories.map((c) => c.id), xc))) out.push(`${m} · reordered categories`);

  // Items can move between categories, so match them across the whole menu by id.
  const where = (menu: Menu) => new Map(menu.categories.flatMap((c) => c.items.map((i) => [i.id, { item: i, cat: c.name, catId: c.id }] as const)));
  const xi = where(x);
  const yi = where(y);

  for (const c of y.categories) {
    const old = xc.get(c.id);
    if (!old) continue;
    if (old.name !== c.name) out.push(`${m} · renamed category “${old.name}” → “${c.name}”`);
    if ((old.servedFrom ?? '') !== (c.servedFrom ?? '') || (old.servedUntil ?? '') !== (c.servedUntil ?? '')) out.push(`${m} · ${c.name}: serving times updated`);
    if ((old.note ?? '') !== (c.note ?? '')) out.push(`${m} · ${c.name}: note updated`);
    if (old.section !== c.section || old.style !== c.style) out.push(`${m} · ${c.name}: layout updated`);
    if (!same(old.addons ?? [], c.addons ?? [])) out.push(`${m} · ${c.name}: add-ons updated`);
    const keep = (ids: string[], other: Map<string, unknown>) => ids.filter((id) => other.has(id));
    const oldIds = new Map(old.items.map((i) => [i.id, i]));
    const newIds = new Map(c.items.map((i) => [i.id, i]));
    if (!same(keep(old.items.map((i) => i.id), newIds), keep(c.items.map((i) => i.id), oldIds))) out.push(`${m} · reordered ${c.name}`);
  }

  for (const [id, { item, cat }] of yi) {
    const old = xi.get(id);
    if (!old) {
      out.push(`${m} · added “${item.name}” to ${cat} (${price(item.prices)})`);
      continue;
    }
    out.push(...itemChanges(m, old.item, item, same));
    if (old.catId !== yi.get(id)!.catId) out.push(`${m} · moved “${item.name}” from ${old.cat} to ${cat}`);
  }
  for (const [id, { item, cat }] of xi) if (!yi.has(id)) out.push(`${m} · removed “${item.name}” from ${cat}`);
  return out;
}

function itemChanges(m: string, a: MenuItem, b: MenuItem, same: (a: unknown, b: unknown) => boolean): string[] {
  const out: string[] = [];
  const n = `${m} · ${b.name}`;
  if (a.name !== b.name) out.push(`${m} · renamed “${a.name}” → “${b.name}”`);
  if (!same(a.prices, b.prices)) {
    const sameShape = a.prices.length === b.prices.length && a.prices.every((p, i) => (p.label ?? '') === (b.prices[i].label ?? ''));
    if (sameShape && a.prices.length > 1) {
      // Only the options that changed: "Poke Bowl · Sashimi tuna: 145K → 140K".
      a.prices.forEach((p, i) => {
        if (p.amount !== b.prices[i].amount) out.push(`${n} · ${p.label ?? `price ${i + 1}`}: ${price([{ amount: p.amount }])} → ${price([{ amount: b.prices[i].amount }])}`);
      });
    } else out.push(`${n}: price ${price(a.prices)} → ${price(b.prices)}`);
  }
  if ((a.description ?? '') !== (b.description ?? '')) out.push(`${n}: description updated`);
  if (!same(a.tags, b.tags)) out.push(`${n}: marks ${a.tags.join(' ') || 'none'} → ${b.tags.join(' ') || 'none'}`);
  if (Boolean(a.soldOut) !== Boolean(b.soldOut)) out.push(`${n}: ${b.soldOut ? 'sold out' : 'back on'}`);
  if (Boolean(a.hidden) !== Boolean(b.hidden)) out.push(`${n}: ${b.hidden ? 'hidden' : 'shown again'}`);
  if (!same(a.onlyAt ?? [], b.onlyAt ?? [])) out.push(`${n}: available at ${b.onlyAt?.length ? b.onlyAt.join(', ') : 'all branches on this menu'}`);
  if (!same(a.addons ?? [], b.addons ?? [])) out.push(`${n}: add-ons updated`);
  if ((a.group ?? '') !== (b.group ?? '')) out.push(`${n}: sub-heading “${b.group ?? ''}”`);
  return out;
}

/** "admin: Berawa · Sunday … (+3 more)" with the full list in the body. */
export function commitMessage(changes: string[]): string {
  if (!changes.length) return 'admin: save (no content changes)';
  const head = changes.length === 1 ? changes[0] : `${changes[0]} (+${changes.length - 1} more)`;
  const subject = `admin: ${head}`.slice(0, 120);
  return `${subject}\n\nSaved from /admin.\n\n${changes.map((c) => `- ${c}`).join('\n')}\n`;
}
