import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import { SECTION_LABELS, TAG_LABELS, TAGS } from '@/lib/constants';
import type { Section, Tag } from '@/lib/schema';
import { servingState } from '@/lib/hours';

interface CategoryInfo {
  id: string;
  name: string;
  section: Section;
  servedFrom?: string;
  servedUntil?: string;
}

interface Props {
  rootId: string;
  categories: CategoryInfo[];
  /** Sync filters to the URL (?diet=V,GF&q=bowl) so a "vegan menu" link can be shared. */
  syncUrl?: boolean;
}

/**
 * Sticky menu toolbar: category chips with scroll-spy, dietary filters and search.
 * It works on the server-rendered menu HTML (toggling `hidden`), so there's no second copy of the menu in JS.
 */
export default function MenuToolbar({ rootId, categories, syncUrl = true }: Props) {
  const [active, setActive] = useState<string | undefined>(categories[0]?.id);
  const [diet, setDiet] = useState<Tag[]>([]);
  const [query, setQuery] = useState('');
  const [visibleCats, setVisibleCats] = useState<Set<string>>(() => new Set(categories.map((c) => c.id)));
  const [count, setCount] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Serving times depend on the visitor's clock, so only compute them after hydration.
  const [mounted, setMounted] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);
  // Whether chips are hidden past either edge of the row (drives the edge fades and arrow buttons).
  // Server HTML assumes the usual case (more chips to the right) until hydration measures it.
  const [edges, setEdges] = useState({ start: false, end: true });
  const root = useRef<HTMLElement | null>(null);

  const sections = useMemo(() => [...new Set(categories.map((c) => c.section))], [categories]);
  const activeSection = categories.find((c) => c.id === active)?.section;

  // Read filters from the URL once.
  useEffect(() => {
    root.current = document.querySelector(`[data-menu-root="${rootId}"]`);
    setMounted(true);
    if (!syncUrl) return;
    const p = new URLSearchParams(location.search);
    const d = (p.get('diet') ?? '').split(',').filter((t): t is Tag => (TAGS as readonly string[]).includes(t));
    if (d.length) setDiet(d);
    if (p.get('q')) setQuery(p.get('q')!);
    if (d.length || p.get('q')) setFiltersOpen(true);
  }, [rootId, syncUrl]);

  // Apply filters to the DOM.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = query
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
    let shown = 0;
    const cats = new Set<string>();
    el.querySelectorAll<HTMLElement>('[data-category]').forEach((sec) => {
      let inCat = 0;
      sec.querySelectorAll<HTMLElement>('[data-group]').forEach((g) => {
        let inGroup = 0;
        g.querySelectorAll<HTMLElement>('[data-item]').forEach((item) => {
          const tags = (item.dataset.tags ?? '').split(' ');
          const ok = diet.every((t) => tags.includes(t)) && (!q || (item.dataset.text ?? '').includes(q));
          item.hidden = !ok;
          if (ok) inGroup++;
        });
        g.hidden = inGroup === 0;
        inCat += inGroup;
      });
      sec.hidden = inCat === 0;
      if (inCat) cats.add(sec.dataset.category!);
      shown += inCat;
    });
    el.querySelector<HTMLElement>('[data-menu-empty]')!.hidden = shown > 0;
    setVisibleCats(cats);
    setCount(diet.length || q ? shown : null);

    if (syncUrl) {
      const url = new URL(location.href);
      diet.length ? url.searchParams.set('diet', diet.join(',')) : url.searchParams.delete('diet');
      q ? url.searchParams.set('q', query) : url.searchParams.delete('q');
      history.replaceState(history.state, '', url);
    }
  }, [diet, query, syncUrl]);

  // "Clear filters" button inside the empty state.
  useEffect(() => {
    const btn = root.current?.querySelector('[data-menu-reset]');
    const reset = () => {
      setDiet([]);
      setQuery('');
    };
    btn?.addEventListener('click', reset);
    return () => btn?.removeEventListener('click', reset);
  }, []);

  // Scroll-spy.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive((top.target as HTMLElement).dataset.category);
        // Scrolled back above the menu: reset to the first category.
        else if (el.getBoundingClientRect().top > window.innerHeight * 0.3) setActive(categories[0]?.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    el.querySelectorAll('[data-category]').forEach((s) => io.observe(s));
    // Jumping back to the top skips the sections, so no observer fires: reset from a cheap scroll check.
    let frame = 0;
    const onScroll = () =>
      (frame ||= requestAnimationFrame(() => {
        frame = 0;
        if (el.getBoundingClientRect().top > window.innerHeight * 0.3) setActive(categories[0]?.id);
      }));
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [categories]);

  // Track overflow on both edges so a half-visible chip reads as "scroll for more", not as cut off.
  useEffect(() => {
    const bar = chipsRef.current;
    if (!bar) return;
    const update = () => {
      const max = bar.scrollWidth - bar.clientWidth;
      setEdges({ start: bar.scrollLeft > 4, end: bar.scrollLeft < max - 4 });
    };
    update();
    bar.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(bar);
    return () => {
      bar.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [visibleCats]);

  const nudge = (dir: 1 | -1) => chipsRef.current?.scrollBy({ left: dir * chipsRef.current.clientWidth * 0.7, behavior: 'smooth' });

  // Keep the active chip in view.
  useEffect(() => {
    const chip = chipsRef.current?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    const bar = chipsRef.current;
    if (chip && bar) bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
  }, [active]);

  // "Served now" state per category, in Bali time.
  useEffect(() => {
    const update = () => {
      root.current?.querySelectorAll<HTMLElement>('[data-category]').forEach((sec) => {
        const state = servingState({ servedFrom: sec.dataset.servedFrom, servedUntil: sec.dataset.servedUntil });
        sec.dataset.serving = state;
        const text = sec.querySelector('[data-serving-text]');
        if (!text) return;
        const base = text.getAttribute('data-base') ?? text.textContent ?? '';
        text.setAttribute('data-base', base);
        text.textContent = state === 'now' ? `Serving now · ${base.replace(/^Served /, '')}` : state === 'always' ? base : `${base} · not now`;
      });
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const goTo = useCallback(
    (id: string) => {
      const target = document.getElementById(`${rootId}-${id}`);
      if (!target) return;
      const lenis = (window as unknown as { lenis?: { scrollTo(t: HTMLElement, o: object): void } }).lenis;
      const offset = -(parseFloat(getComputedStyle(document.documentElement).fontSize) * 9.5);
      if (lenis) lenis.scrollTo(target, { offset, duration: 1.1 });
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' });
      setActive(id);
    },
    [rootId],
  );

  const toggleTag = (t: Tag) => setDiet((d) => (d.includes(t) ? d.filter((x) => x !== t) : [...d, t]));
  const filtered = diet.length > 0 || query.length > 0;

  return (
    <div className="sticky top-[var(--header-h)] z-30 -mx-4 mb-6 bg-paper/92 px-4 pb-3 pt-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      {/* Section tabs */}
      <div className="flex items-center justify-between gap-3">
        <LayoutGroup id={`${rootId}-sections`}>
          <div className="flex gap-1 rounded-full bg-ink/5 p-1" role="tablist" aria-label="Menu sections">
            {sections.map((s) => {
              const first = categories.find((c) => c.section === s && visibleCats.has(c.id));
              const isActive = activeSection === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  disabled={!first}
                  onClick={() => first && goTo(first.id)}
                  className="relative rounded-full px-2.5 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider disabled:opacity-30 sm:px-4 sm:text-[0.78rem]"
                >
                  {isActive && (
                    <motion.span layoutId={`${rootId}-section-pill`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                  )}
                  <span className={`relative ${isActive ? 'text-paper' : ''}`}>{SECTION_LABELS[s]}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          aria-controls={`${rootId}-filters`}
          className={`btn !min-h-9 !px-3 text-xs ${filtered ? 'btn-accent' : 'btn-ghost'}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 6h18M7 12h10M10 18h4" />
          </svg>
          Filter{diet.length ? ` · ${diet.length}` : ''}
        </button>
      </div>

      {/* Filters */}
      <div id={`${rootId}-filters`} hidden={!filtersOpen} className="mt-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block lg:w-72">
            <span className="sr-only">Search this menu</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search this menu…"
              className="h-10 w-full rounded-full bg-cream px-4 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dietary filters">
            {TAGS.map((t) => {
              const on = diet.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTag(t)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${on ? 'bg-accent text-white' : 'bg-cream ring-1 ring-line hover:bg-white'}`}
                >
                  {TAG_LABELS[t]} <span className="opacity-60">{t}</span>
                </button>
              );
            })}
            {filtered && (
              <button type="button" onClick={() => (setDiet([]), setQuery(''))} className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted underline">
                Clear
              </button>
            )}
          </div>
          {count !== null && (
            <p className="text-xs text-muted lg:ml-auto" aria-live="polite">
              {count} {count === 1 ? 'item' : 'items'}
              {diet.length > 0 && ' · marks as printed on the café’s menu'}
            </p>
          )}
        </div>
      </div>

      {/* Category chips */}
      <LayoutGroup id={`${rootId}-cats`}>
        <div className="relative mt-3">
          <div
            ref={chipsRef}
            className="chip-row scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1"
            data-fade-start={edges.start || undefined}
            data-fade-end={edges.end || undefined}
            aria-label="Menu categories"
          >
            {categories
              .filter((c) => visibleCats.has(c.id))
              .map((c) => {
                const isActive = c.id === active;
                const serving = mounted ? servingState(c) : 'always';
                return (
                  <button
                    key={c.id}
                    type="button"
                    data-chip={c.id}
                    onClick={() => goTo(c.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className="relative shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold"
                  >
                    {isActive && (
                      <motion.span layoutId={`${rootId}-cat-pill`} className="absolute inset-0 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                    )}
                    <span className={`relative flex items-center gap-1.5 ${isActive ? 'text-white' : ''}`}>
                      {c.name}
                      {(serving === 'later' || serving === 'ended') && (
                        <span className="size-1.5 rounded-full bg-amber-500" title="Not being served right now" aria-label="not served right now" />
                      )}
                    </span>
                  </button>
                );
              })}
          </div>
          {(['start', 'end'] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => nudge(side === 'start' ? -1 : 1)}
              aria-label={side === 'start' ? 'Scroll categories left' : 'Scroll categories right'}
              tabIndex={-1}
              className={`absolute top-1/2 hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-cream shadow-md ring-1 ring-line transition-opacity lg:grid ${
                side === 'start' ? '-left-2' : '-right-2'
              } ${edges[side] ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={side === 'start' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
              </svg>
            </button>
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}
