import { useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import type { SearchEntry } from '@/pages/search-index.json';
import { TAG_LABELS } from '@/lib/constants';
import type { Tag } from '@/lib/schema';

/**
 * ⌘K / Ctrl+K "Find a dish" across all three cafés.
 * Answers "where can I get pizza?" with branch chips. Index is fetched on first open.
 */
export default function DishSearch() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-open-search]')) setOpen(true);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, []);

  useEffect(() => {
    if (!open || index) return;
    fetch('/search-index.json')
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setIndex([]));
  }, [open, index]);

  // Pause smooth scroll while the dialog is open.
  useEffect(() => {
    const lenis = (window as unknown as { lenis?: { stop(): void; start(): void } }).lenis;
    if (open) lenis?.stop();
    else lenis?.start();
  }, [open]);

  const suggestions = useMemo(() => ['açaí', 'poke', 'pizza', 'vegan', 'shakshouka', 'latte'], []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Find a dish"
      shouldFilter
      filter={(value, search) => (value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').includes(normalize(search)) ? 1 : 0)}
      overlayClassName="fixed inset-0 z-[90] bg-ink/40 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[8vh] z-[91] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-3xl bg-cream shadow-2xl ring-1 ring-black/10"
    >
      <div className="flex items-center gap-3 border-b border-line px-5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search the menu: bowls, pizza, vegan…"
          className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted"
        />
        <kbd className="rounded-md bg-ink/5 px-1.5 py-0.5 text-[0.68rem] text-muted">esc</kbd>
      </div>
      <Command.List className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain p-2" data-lenis-prevent>
        {!index && <Command.Loading>Loading menu…</Command.Loading>}
        <Command.Empty className="p-6 text-center text-sm text-muted">
          No dish found. Try “bowl”, “vegan” or “coffee”.
        </Command.Empty>
        {!query && index && (
          <Command.Group heading="Try" className="px-2 pb-2 text-xs text-muted [&_[cmdk-group-items]]:mt-2 [&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-wrap [&_[cmdk-group-items]]:gap-2">
            {suggestions.map((s) => (
              <Command.Item
                key={s}
                value={`try ${s}`}
                onSelect={() => setQuery(s)}
                className="cursor-pointer rounded-full bg-ink/5 px-3 py-1.5 text-sm text-ink data-[selected=true]:bg-ink data-[selected=true]:text-paper"
              >
                {s}
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {query &&
          index?.map((e) => (
            <Command.Item
              key={e.n + e.c}
              value={`${e.n} ${e.c} ${e.t.map((t) => TAG_LABELS[t as Tag]).join(' ')}`}
              onSelect={() => (window.location.href = `/${e.at[0].b}#item-${e.at[0].id}`)}
              className="group flex cursor-pointer flex-col gap-1.5 rounded-2xl px-3 py-3 data-[selected=true]:bg-ink/5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{e.n}</span>
                <span className="shrink-0 text-xs text-muted">{e.c}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {e.at.map((a) => (
                  <a
                    key={a.b}
                    href={`/${a.b}#item-${a.id}`}
                    data-branch={a.b}
                    onClick={(ev) => ev.stopPropagation()}
                    className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent hover:bg-accent hover:text-white"
                  >
                    {a.name}
                  </a>
                ))}
                {e.t.map((t) => (
                  <span key={t} title={TAG_LABELS[t as Tag]} className="rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold text-muted ring-1 ring-line">
                    {t}
                  </span>
                ))}
              </div>
            </Command.Item>
          ))}
      </Command.List>
    </Command.Dialog>
  );
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
