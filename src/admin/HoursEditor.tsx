import { useState } from 'react';
import { BRANCH_SLUGS, WEEKDAYS, type BranchSlug, type ContentBundle, type TimeRange } from '@/lib/schema';
import { WEEKDAY_NAMES, getStatus, statusLabel } from '@/lib/hours';
import { Button, Card, Field, Input, Segmented, Toggle } from './ui';

type Update = (fn: (d: ContentBundle) => void) => void;

const DEFAULT_RANGE: TimeRange = { open: '07:00', close: '22:00' };

export default function HoursEditor({ draft, update }: { draft: ContentBundle; update: Update }) {
  const [slug, setSlug] = useState<BranchSlug>('uluwatu');
  const b = draft.branches[slug];
  const preview = statusLabel(getStatus(b));

  const setDay = (d: (typeof WEEKDAYS)[number], ranges: TimeRange[]) => update((x) => void (x.branches[slug].hours[d] = ranges));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={slug} onChange={setSlug} options={BRANCH_SLUGS.map((s) => ({ value: s, label: draft.branches[s].name, branch: s }))} />
        <p className="rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-line" data-branch={slug}>
          Right now: <strong>{preview.headline}</strong> {preview.detail && `· ${preview.detail}`}
        </p>
      </div>

      <Card
        title="Weekly hours"
        actions={
          <Button variant="quiet" onClick={() => update((x) => WEEKDAYS.forEach((d) => (x.branches[slug].hours[d] = structuredClone(x.branches[slug].hours.mon))))}>
            Copy Monday to every day
          </Button>
        }
      >
        <div className="grid gap-2">
          {WEEKDAYS.map((d) => {
            const ranges = b.hours[d];
            return (
              <div key={d} className="grid items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-line sm:grid-cols-[8rem_1fr_auto]">
                <span className="font-bold">{WEEKDAY_NAMES[d]}</span>
                <div className="flex flex-col gap-2">
                  {ranges.length === 0 && <span className="text-sm text-muted">Closed</span>}
                  {ranges.map((r, i) => (
                    <RangeRow
                      key={i}
                      range={r}
                      onChange={(nr) => setDay(d, ranges.map((x, k) => (k === i ? nr : x)))}
                      onRemove={() => setDay(d, ranges.filter((_, k) => k !== i))}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  {ranges.length < 3 && (
                    <Button variant="quiet" onClick={() => setDay(d, [...ranges, ranges.length ? { open: ranges[ranges.length - 1].close, close: '22:00' } : DEFAULT_RANGE])}>
                      + {ranges.length ? 'Split' : 'Open'}
                    </Button>
                  )}
                  {ranges.length > 0 && (
                    <Button variant="quiet" onClick={() => setDay(d, [])}>
                      Closed
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 rounded-2xl bg-accent-soft/60 p-3" data-branch={slug}>
          <Toggle
            checked={b.hoursConfirmed}
            onChange={(v) => update((x) => void (x.branches[slug].hoursConfirmed = v))}
            label="The owner has confirmed these hours (removes the “to be confirmed” notes)"
          />
        </div>
      </Card>

      <Card
        title="Special days"
        actions={
          <Button
            variant="ghost"
            onClick={() =>
              update((x) =>
                void x.branches[slug].specialDays.push({
                  date: new Date(Date.now() + 8 * 3600e3 + 86400e3).toISOString().slice(0, 10),
                  label: 'Holiday',
                  hours: [],
                }),
              )
            }
          >
            + Add a day
          </Button>
        }
      >
        <p className="mb-3 text-sm text-muted">For Nyepi, holidays or private events. These override the weekly hours on that date.</p>
        {b.specialDays.length === 0 && <p className="text-sm text-muted">No special days.</p>}
        <div className="grid gap-2">
          {b.specialDays.map((s, i) => (
            <div key={i} className="grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-line sm:grid-cols-[10rem_1fr_auto] sm:items-end">
              <Field label="Date">
                <Input type="date" value={s.date} onChange={(e) => update((x) => void (x.branches[slug].specialDays[i].date = e.target.value))} />
              </Field>
              <div className="grid gap-2">
                <Field label="What">
                  <Input value={s.label} maxLength={60} onChange={(e) => update((x) => void (x.branches[slug].specialDays[i].label = e.target.value))} />
                </Field>
                {s.hours.map((r, k) => (
                  <RangeRow
                    key={k}
                    range={r}
                    onChange={(nr) => update((x) => void (x.branches[slug].specialDays[i].hours[k] = nr))}
                    onRemove={() => update((x) => void x.branches[slug].specialDays[i].hours.splice(k, 1))}
                  />
                ))}
                <div className="flex gap-2">
                  {s.hours.length === 0 ? (
                    <Button variant="quiet" onClick={() => update((x) => void x.branches[slug].specialDays[i].hours.push({ ...DEFAULT_RANGE }))}>
                      Closed all day · set hours instead
                    </Button>
                  ) : (
                    <Button variant="quiet" onClick={() => update((x) => void (x.branches[slug].specialDays[i].hours = []))}>
                      Make it closed all day
                    </Button>
                  )}
                </div>
              </div>
              <Button variant="quiet" onClick={() => update((x) => void x.branches[slug].specialDays.splice(i, 1))}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Temporarily closed">
        <div className="grid gap-3">
          <Toggle
            tone="danger"
            checked={b.temporarilyClosed.active}
            onChange={(v) => update((x) => void (x.branches[slug].temporarilyClosed.active = v))}
            label={`${b.name} is temporarily closed (shows a red banner and “Temporarily closed” everywhere)`}
          />
          {b.temporarilyClosed.active && (
            <Field label="Message for guests">
              <Input
                value={b.temporarilyClosed.message}
                maxLength={160}
                placeholder="e.g. Closed for renovation, back on 1 November"
                onChange={(e) => update((x) => void (x.branches[slug].temporarilyClosed.message = e.target.value))}
              />
            </Field>
          )}
        </div>
      </Card>
    </div>
  );
}

function RangeRow({ range, onChange, onRemove }: { range: TimeRange; onChange: (r: TimeRange) => void; onRemove: () => void }) {
  const crosses = range.close <= range.open;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="time" aria-label="Opens" value={range.open} onChange={(e) => onChange({ ...range, open: e.target.value })} className="!w-32" />
      <span className="text-muted">to</span>
      <Input type="time" aria-label="Closes" value={range.close === '24:00' ? '00:00' : range.close} onChange={(e) => onChange({ ...range, close: e.target.value })} className="!w-32" />
      {crosses && <span className="text-xs text-muted">(past midnight)</span>}
      <Button variant="quiet" onClick={onRemove} title="Remove this time range">
        ✕
      </Button>
    </div>
  );
}
