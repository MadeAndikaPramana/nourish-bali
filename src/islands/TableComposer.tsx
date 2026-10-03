import { useEffect, useMemo, useState } from 'react';
import { Drawer } from 'vaul';
import { baliClock, formatTime, rangesForDate, toMinutes } from '@/lib/hours';
import { tableMessage, waLink } from '@/lib/links';
import { WEEKDAYS } from '@/lib/constants';
import type { Branch } from '@/lib/schema';

interface Props {
  branch: Pick<Branch, 'name' | 'whatsapp' | 'hours' | 'hoursConfirmed' | 'specialDays' | 'temporarilyClosed'>;
  label?: string;
  className?: string;
}

/**
 * "Ask for a table" bottom sheet: party size + day + time → a pre-filled WhatsApp message,
 * e.g. "Hi Nourish Berawa, is there a table for 4 at 9am today?". Nothing is booked automatically.
 */
export default function TableComposer({ branch, label = 'Ask for a table', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState(2);
  const [day, setDay] = useState<'today' | 'tomorrow'>('today');
  const [slot, setSlot] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [edited, setEdited] = useState(false);
  const [now, setNow] = useState<ReturnType<typeof baliClock> | null>(null);

  useEffect(() => {
    if (open) setNow(baliClock());
  }, [open]);

  // Half-hour slots inside the café's hours for the chosen day, skipping times already past.
  const slots = useMemo(() => {
    if (!now) return [];
    const d = new Date(`${now.date}T00:00:00Z`);
    if (day === 'tomorrow') d.setUTCDate(d.getUTCDate() + 1);
    const date = d.toISOString().slice(0, 10);
    const weekday = WEEKDAYS[(d.getUTCDay() + 6) % 7];
    const out: string[] = [];
    for (const r of rangesForDate(branch, date, weekday).ranges) {
      const open = toMinutes(r.open);
      let close = toMinutes(r.close);
      if (close <= open) close += 1440;
      for (let m = Math.ceil(open / 30) * 30; m <= close - 60; m += 30) {
        if (day === 'today' && m < now.minutes + 30) continue;
        const mm = m % 1440;
        out.push(`${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`);
      }
    }
    return out;
  }, [now, day, branch]);

  useEffect(() => {
    if (slot && !slots.includes(slot)) setSlot(null);
  }, [slots, slot]);

  useEffect(() => {
    if (edited) return;
    setMessage(slot ? tableMessage(branch.name, people, formatTime(slot), day) : `Hi Nourish ${branch.name}, is there a table for ${people} ${day}?`);
  }, [people, day, slot, branch.name, edited]);

  const closedNote = branch.temporarilyClosed.active ? branch.temporarilyClosed.message || 'The café is temporarily closed.' : null;

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
      <Drawer.Trigger className={className}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Z" />
        </svg>
        {label}
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-ink/45 backdrop-blur-[2px]" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[92dvh] max-w-xl flex-col rounded-t-[2rem] bg-cream text-ink outline-none"
          aria-describedby={undefined}
          data-lenis-prevent
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-ink/15" aria-hidden="true" />
          <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-7">
            <Drawer.Title className="display text-3xl">Table at {branch.name}</Drawer.Title>
            <p className="mt-1 text-sm text-muted">Pick the details and we’ll write the WhatsApp message for you. The café replies to confirm.</p>
            {closedNote && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{closedNote}</p>}

            <fieldset className="mt-6">
              <legend className="eyebrow text-muted">How many people</legend>
              <div className="mt-2 flex items-center gap-3">
                <button type="button" className="btn btn-ghost !size-11 !p-0 text-xl" onClick={() => setPeople((p) => Math.max(1, p - 1))} aria-label="Fewer people">
                  −
                </button>
                <output className="display w-14 text-center text-4xl tabular-nums" aria-live="polite">
                  {people}
                </output>
                <button type="button" className="btn btn-ghost !size-11 !p-0 text-xl" onClick={() => setPeople((p) => Math.min(20, p + 1))} aria-label="More people">
                  +
                </button>
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="eyebrow text-muted">When</legend>
              <div className="mt-2 flex gap-2">
                {(['today', 'tomorrow'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={day === d}
                    onClick={() => setDay(d)}
                    className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${day === d ? 'bg-ink text-paper' : 'bg-white ring-1 ring-line'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                {slots.length === 0 && <p className="text-sm text-muted">No times left {day}. Try tomorrow.</p>}
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={slot === s}
                    onClick={() => setSlot(s)}
                    className={`rounded-full px-3 py-1.5 text-sm tabular-nums ${slot === s ? 'bg-accent font-bold text-white' : 'bg-white ring-1 ring-line hover:ring-ink/30'}`}
                  >
                    {formatTime(s)}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="mt-6 block">
              <span className="eyebrow text-muted">Message</span>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setEdited(true);
                }}
                rows={3}
                className="mt-2 w-full rounded-2xl bg-white p-3 text-[0.95rem] ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
              />
            </label>

            <a href={waLink(branch.whatsapp, message)} target="_blank" rel="noopener" className="btn btn-wa mt-4 w-full !min-h-12 text-base">
              Open WhatsApp
            </a>
            <p className="mt-3 text-center text-xs text-muted">
              Sends to {branch.whatsapp}.{!branch.hoursConfirmed && ' Opening hours on this page are still being confirmed with the café.'}
            </p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
