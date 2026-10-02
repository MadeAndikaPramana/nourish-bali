import { useMemo, useState, type ReactNode } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BRANCH_SLUGS,
  MENU_IDS,
  SECTIONS,
  SECTION_LABELS,
  TAGS,
  TAG_LABELS,
  type Category,
  type ContentBundle,
  type MenuId,
  type MenuItem,
} from '@/lib/schema';
import { AmountInput, Button, Card, Field, Input, Segmented, TextArea, Toggle, inputCls } from './ui';

type Update = (fn: (d: ContentBundle) => void) => void;

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export default function MenuEditor({ draft, update }: { draft: ContentBundle; update: Update }) {
  const [menuId, setMenuId] = useState<MenuId>('bukit');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [percent, setPercent] = useState(0);
  const menu = draft.menus[menuId];
  const names = (id: MenuId) =>
    Object.values(draft.branches)
      .filter((b) => b.menu === id)
      .map((b) => b.name)
      .join(' & ');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const q = norm(query.trim());
  const matches = useMemo(() => {
    if (!q) return null;
    const hit = new Set<string>();
    for (const c of menu.categories) for (const i of c.items) if (norm(`${i.name} ${i.description ?? ''}`).includes(q)) hit.add(i.id);
    return hit;
  }, [q, menu]);

  const mutateMenu = (fn: (m: ContentBundle['menus'][MenuId]) => void) => update((d) => fn(d.menus[menuId]));
  const onCategoryDrag = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    mutateMenu((m) => {
      const from = m.categories.findIndex((c) => c.id === e.active.id);
      const to = m.categories.findIndex((c) => c.id === e.over!.id);
      m.categories = arrayMove(m.categories, from, to);
    });
  };

  const applyPercent = () => {
    if (!percent) return;
    if (!confirm(`Change every price on the ${names(menuId)} menu by ${percent > 0 ? '+' : ''}${percent}%? Prices are rounded to the nearest 1K.`)) return;
    const f = (n: number) => Math.max(0, Math.round(n * (1 + percent / 100)));
    mutateMenu((m) =>
      m.categories.forEach((c) => {
        c.addons?.forEach((a) => (a.amount = f(a.amount)));
        c.items.forEach((i) => {
          i.prices.forEach((p) => (p.amount = f(p.amount)));
          i.addons?.forEach((a) => (a.amount = f(a.amount)));
        });
      }),
    );
    setPercent(0);
  };

  const itemTotal = menu.categories.reduce((n, c) => n + c.items.length, 0);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={menuId} onChange={setMenuId} options={MENU_IDS.map((id) => ({ value: id, label: names(id) }))} />
        <p className="text-sm text-muted">
          {menu.categories.length} categories · {itemTotal} items
        </p>
      </div>

      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <Field label="Find a dish">
            <Input type="search" value={query} placeholder="Type to filter, e.g. poke" onChange={(e) => setQuery(e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Change all prices by">
              <span className="relative inline-flex w-28 items-center">
                <input type="number" value={percent || ''} step={1} placeholder="0" onChange={(e) => setPercent(Number(e.target.value))} className={`${inputCls} pr-7 text-right`} />
                <span className="pointer-events-none absolute right-3 text-sm font-bold text-muted">%</span>
              </span>
            </Field>
            <Button variant="ghost" onClick={applyPercent} disabled={!percent}>
              Apply
            </Button>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
          <Toggle
            checked={menu.samplePrices}
            onChange={(v) => mutateMenu((m) => void (m.samplePrices = v))}
            label="Prices are samples (shows the “Sample prices” notice). Turn off once the real prices are in."
          />
        </div>
      </Card>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoryDrag}>
        <SortableContext items={menu.categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-3">
            {menu.categories.map((c, ci) => {
              const visible = matches ? c.items.some((i) => matches.has(i.id)) : true;
              if (!visible) return null;
              const isOpen = open.has(c.id) || Boolean(matches);
              return (
                <SortableRow key={c.id} id={c.id} disabled={Boolean(matches)}>
                  {(handle) => (
                    <CategoryBlock
                      category={c}
                      menuId={menuId}
                      isOpen={isOpen}
                      handle={handle}
                      matches={matches}
                      shared={menu.branches.length > 1 ? menu.branches : null}
                      onToggle={() =>
                        setOpen((s) => {
                          const n = new Set(s);
                          n.has(c.id) ? n.delete(c.id) : n.add(c.id);
                          return n;
                        })
                      }
                      update={(fn) => mutateMenu((m) => fn(m.categories[ci]))}
                      onDelete={() => {
                        if (confirm(`Delete the category “${c.name}” and its ${c.items.length} items?`)) mutateMenu((m) => void m.categories.splice(ci, 1));
                      }}
                    />
                  )}
                </SortableRow>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {!matches && (
        <Button
          variant="ink"
          onClick={() => {
            const id = newId('category');
            mutateMenu((m) => void m.categories.push({ id, name: 'New category', section: 'food', style: 'cards', items: [] }));
            setOpen((s) => new Set(s).add(id));
          }}
        >
          + Add category
        </Button>
      )}
    </div>
  );
}

function SortableRow({ id, disabled, children }: { id: string; disabled?: boolean; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      disabled={disabled}
      aria-label="Drag to reorder"
      className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted hover:bg-ink/5 active:cursor-grabbing disabled:opacity-20"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        {[6, 12, 18].flatMap((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
      </svg>
    </button>
  );
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? 'relative z-10 opacity-80 shadow-2xl' : ''}>
      {children(handle)}
    </div>
  );
}

function CategoryBlock({
  category: c,
  menuId,
  isOpen,
  handle,
  matches,
  shared,
  onToggle,
  update,
  onDelete,
}: {
  category: Category;
  menuId: MenuId;
  isOpen: boolean;
  handle: ReactNode;
  matches: Set<string> | null;
  shared: string[] | null;
  onToggle: () => void;
  update: (fn: (c: Category) => void) => void;
  onDelete: () => void;
}) {
  const [settings, setSettings] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onItemDrag = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    update((cat) => {
      const from = cat.items.findIndex((i) => i.id === e.active.id);
      const to = cat.items.findIndex((i) => i.id === e.over!.id);
      cat.items = arrayMove(cat.items, from, to);
    });
  };
  const soldOut = c.items.filter((i) => i.soldOut).length;

  return (
    <div className="rounded-3xl bg-cream ring-1 ring-line">
      <div className="flex items-center gap-2 p-2 pr-3">
        {handle}
        <button type="button" onClick={onToggle} aria-expanded={isOpen} className="flex min-h-11 flex-1 items-center gap-3 text-left">
          <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true">
            ›
          </span>
          <span className="font-display text-lg font-extrabold uppercase [font-stretch:110%]">{c.name}</span>
          <span className="text-sm text-muted">
            {c.items.length} items{soldOut ? ` · ${soldOut} sold out` : ''}
          </span>
        </button>
        <Button variant="quiet" onClick={() => setSettings((s) => !s)}>
          Settings
        </Button>
      </div>

      {settings && (
        <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Category name">
            <Input value={c.name} maxLength={60} onChange={(e) => update((x) => void (x.name = e.target.value))} />
          </Field>
          <Field label="Section">
            <select value={c.section} onChange={(e) => update((x) => void (x.section = e.target.value as Category['section']))} className={inputCls}>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {SECTION_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Served from" hint="Leave empty if served all day">
            <Input type="time" value={c.servedFrom ?? ''} onChange={(e) => update((x) => void (x.servedFrom = e.target.value || undefined))} />
          </Field>
          <Field label="Served until">
            <Input type="time" value={c.servedUntil ?? ''} onChange={(e) => update((x) => void (x.servedUntil = e.target.value || undefined))} />
          </Field>
          <Field label="Note under the title" className="sm:col-span-2">
            <Input value={c.note ?? ''} maxLength={160} onChange={(e) => update((x) => void (x.note = e.target.value || undefined))} />
          </Field>
          <Field label="Layout">
            <select value={c.style} onChange={(e) => update((x) => void (x.style = e.target.value as Category['style']))} className={inputCls}>
              <option value="cards">Cards (dishes with descriptions)</option>
              <option value="list">List (coffee, extras, drinks)</option>
            </select>
          </Field>
          <div className="flex items-end">
            <Button variant="danger" onClick={onDelete}>
              Delete category
            </Button>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="border-t border-line p-2 sm:p-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onItemDrag}>
            <SortableContext items={c.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-2">
                {c.items.map((item, ii) =>
                  matches && !matches.has(item.id) ? null : (
                    <SortableRow key={item.id} id={item.id} disabled={Boolean(matches)}>
                      {(h) => (
                        <ItemRow
                          item={item}
                          handle={h}
                          shared={shared}
                          menuId={menuId}
                          update={(fn) => update((cat) => fn(cat.items[ii]))}
                          onDelete={() => {
                            if (confirm(`Delete “${item.name}”?`)) update((cat) => void cat.items.splice(ii, 1));
                          }}
                        />
                      )}
                    </SortableRow>
                  ),
                )}
              </div>
            </SortableContext>
          </DndContext>
          {!matches && (
            <Button variant="quiet" className="mt-2" onClick={() => update((x) => void x.items.push({ id: newId('item'), name: 'New dish', tags: [], prices: [{ amount: 0 }] }))}>
              + Add item to {c.name}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({
  item,
  handle,
  shared,
  update,
  onDelete,
}: {
  item: MenuItem;
  handle: ReactNode;
  shared: string[] | null;
  menuId: MenuId;
  update: (fn: (i: MenuItem) => void) => void;
  onDelete: () => void;
}) {
  const [more, setMore] = useState(false);
  return (
    <div className={`rounded-2xl bg-white p-2 ring-1 ring-line ${item.hidden ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        {handle}
        <input
          value={item.name}
          aria-label="Dish name"
          maxLength={100}
          onChange={(e) => update((x) => void (x.name = e.target.value))}
          className={`${inputCls} !h-10 min-w-0 flex-1 basis-48 font-semibold`}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {item.prices.map((p, k) => (
            <span key={k} className="inline-flex items-center gap-1">
              {item.prices.length > 1 && (
                <input
                  value={p.label ?? ''}
                  placeholder="Label"
                  aria-label="Price label"
                  onChange={(e) => update((x) => void (x.prices[k].label = e.target.value || undefined))}
                  className={`${inputCls} !h-10 !w-28 text-sm`}
                />
              )}
              <AmountInput label={`Price ${k + 1}`} value={p.amount} onChange={(v) => update((x) => void (x.prices[k].amount = v))} />
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Dietary marks">
          {TAGS.map((t) => {
            const on = item.tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                title={TAG_LABELS[t]}
                aria-pressed={on}
                onClick={() => update((x) => void (x.tags = on ? x.tags.filter((y) => y !== t) : TAGS.filter((y) => y === t || x.tags.includes(y))))}
                className={`h-9 min-w-9 rounded-lg px-1.5 text-xs font-extrabold ${on ? 'bg-accent text-white' : 'bg-ink/5 text-muted'}`}
              >
                {t}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-pressed={Boolean(item.soldOut)}
          onClick={() => update((x) => void (x.soldOut = !x.soldOut || undefined))}
          className={`h-9 rounded-lg px-2.5 text-xs font-bold ${item.soldOut ? 'bg-rose-600 text-white' : 'bg-ink/5 text-muted'}`}
        >
          {item.soldOut ? 'Sold out' : 'Available'}
        </button>
        <Button variant="quiet" onClick={() => setMore((m) => !m)}>
          {more ? 'Less' : 'More'}
        </Button>
      </div>

      {more && (
        <div className="mt-3 grid gap-3 border-t border-line px-1 pb-1 pt-3 md:grid-cols-2">
          <Field label="Description" className="md:col-span-2">
            <TextArea value={item.description ?? ''} onChange={(v) => update((x) => void (x.description = v || undefined))} />
          </Field>
          <Field label="Sub-heading" hint="Optional, e.g. “Red” in the wine list">
            <Input value={item.group ?? ''} maxLength={40} onChange={(e) => update((x) => void (x.group = e.target.value || undefined))} />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Prices</span>
            <div className="flex flex-wrap gap-2">
              {item.prices.length < 4 && (
                <Button variant="quiet" onClick={() => update((x) => void x.prices.push({ label: 'Large', amount: 0 }))}>
                  + Price option (size, protein…)
                </Button>
              )}
              {item.prices.length > 1 && (
                <Button variant="quiet" onClick={() => update((x) => void (x.prices = [{ amount: x.prices[0].amount }]))}>
                  Single price
                </Button>
              )}
            </div>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Add-ons</span>
            {(item.addons ?? []).map((a, k) => (
              <div key={k} className="flex flex-wrap items-center gap-2">
                <Input value={a.label} className="!h-10 !w-56" aria-label="Add-on name" onChange={(e) => update((x) => void (x.addons![k].label = e.target.value))} />
                <AmountInput label="Add-on price" value={a.amount} onChange={(v) => update((x) => void (x.addons![k].amount = v))} />
                <Button variant="quiet" onClick={() => update((x) => void (x.addons!.splice(k, 1), x.addons!.length || (x.addons = undefined)))}>
                  ✕
                </Button>
              </div>
            ))}
            {(item.addons?.length ?? 0) < 6 && (
              <Button variant="quiet" onClick={() => update((x) => void (x.addons = [...(x.addons ?? []), { label: 'Extra', amount: 0 }]))}>
                + Add-on
              </Button>
            )}
          </div>
          {shared && (
            <div className="flex flex-col gap-2 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Available at</span>
              <div className="flex flex-wrap gap-2">
                {BRANCH_SLUGS.filter((s) => shared.includes(s)).map((s) => {
                  const all = !item.onlyAt?.length;
                  const on = all || item.onlyAt!.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      data-branch={s}
                      onClick={() =>
                        update((x) => {
                          const cur = x.onlyAt?.length ? x.onlyAt : [...shared];
                          // Keep at least one branch; use "Hide from the website" to remove a dish everywhere.
                          if (on && cur.length === 1) return;
                          const next = (on ? cur.filter((y) => y !== s) : [...cur, s]) as MenuItem['onlyAt'];
                          x.onlyAt = !next?.length || next.length === shared.length ? undefined : next;
                        })
                      }
                      className={`min-h-10 rounded-xl px-3 text-sm font-bold capitalize ${on ? 'bg-accent text-white' : 'bg-ink/5 text-muted'}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-2">
            <Toggle checked={Boolean(item.hidden)} onChange={(v) => update((x) => void (x.hidden = v || undefined))} label="Hide from the website" />
            <Button variant="danger" onClick={onDelete}>
              Delete item
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
