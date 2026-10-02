import { WEEKDAYS, type Branch, type Category, type TimeRange, type Weekday } from './schema';

/**
 * Opening-hours logic in Bali time (WITA, UTC+8). Bali has no daylight saving,
 * so a fixed offset is exact and avoids depending on the visitor's Intl/timezone data.
 */
export const BALI_OFFSET_MIN = 8 * 60;
const DAY = 1440;
const CLOSING_SOON_MIN = 30;

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export interface BaliClock {
  /** YYYY-MM-DD in Bali */
  date: string;
  weekday: Weekday;
  /** Minutes since Bali midnight */
  minutes: number;
}

export function baliClock(now: Date = new Date()): BaliClock {
  const shifted = new Date(now.getTime() + BALI_OFFSET_MIN * 60_000);
  const jsDay = shifted.getUTCDay(); // 0 = Sunday
  return {
    date: shifted.toISOString().slice(0, 10),
    weekday: WEEKDAYS[(jsDay + 6) % 7],
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

export const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** "07:00" → "7am", "22:30" → "10:30pm", "24:00" → "midnight" */
export function formatTime(t: string): string {
  const total = toMinutes(t) % DAY;
  if (toMinutes(t) === DAY || total === 0) return 'midnight';
  if (total === 720) return 'noon';
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

export const formatRange = (r: TimeRange) => `${formatTime(r.open)}–${formatTime(r.close)}`;

function addDays(isoDate: string, days: number): { date: string; weekday: Weekday } {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return { date: d.toISOString().slice(0, 10), weekday: WEEKDAYS[(d.getUTCDay() + 6) % 7] };
}

type HoursSource = Pick<Branch, 'hours' | 'specialDays' | 'temporarilyClosed'>;

export function rangesForDate(branch: HoursSource, date: string, weekday: Weekday) {
  const special = branch.specialDays.find((s) => s.date === date);
  return { ranges: special ? special.hours : branch.hours[weekday], special };
}

interface Interval {
  start: number;
  end: number;
  dayOffset: number;
  open: string;
  close: string;
}

/** Absolute intervals (minutes from Bali midnight today) from yesterday through the next week. */
function intervals(branch: HoursSource, clock: BaliClock, daysAhead = 8): Interval[] {
  const out: Interval[] = [];
  for (let k = -1; k <= daysAhead; k++) {
    const { date, weekday } = addDays(clock.date, k);
    for (const r of rangesForDate(branch, date, weekday).ranges) {
      const open = toMinutes(r.open);
      let close = toMinutes(r.close);
      if (close <= open) close += DAY; // crosses midnight, e.g. 18:00–02:00
      out.push({ start: k * DAY + open, end: k * DAY + close, dayOffset: k, open: r.open, close: r.close });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

export type OpenStatus =
  | { kind: 'open'; closesAt: string; minutesLeft: number; closingSoon: boolean; specialLabel?: string }
  | {
      kind: 'closed';
      reason: 'hours' | 'special' | 'temporary';
      message?: string;
      specialLabel?: string;
      opensAt?: { time: string; day: 'today' | 'tomorrow' | Weekday };
      minutesUntil?: number;
    };

export function getStatus(branch: HoursSource, now: Date = new Date()): OpenStatus {
  if (branch.temporarilyClosed.active) {
    return { kind: 'closed', reason: 'temporary', message: branch.temporarilyClosed.message || undefined };
  }
  const clock = baliClock(now);
  const t = clock.minutes;
  const all = intervals(branch, clock);
  const todaySpecial = rangesForDate(branch, clock.date, clock.weekday).special;

  const current = all.find((i) => i.start <= t && t < i.end);
  if (current) {
    // Merge back-to-back ranges (e.g. 00:00–02:00 continuing yesterday's 18:00–24:00).
    let end = current.end;
    let close = current.close;
    for (const next of all) {
      if (next.start === end) {
        end = next.end;
        close = next.close;
      }
    }
    const minutesLeft = end - t;
    return {
      kind: 'open',
      closesAt: close,
      minutesLeft,
      closingSoon: minutesLeft <= CLOSING_SOON_MIN,
      specialLabel: todaySpecial?.label,
    };
  }

  const next = all.find((i) => i.start > t);
  const reason = todaySpecial && todaySpecial.hours.length === 0 ? 'special' : 'hours';
  if (!next) return { kind: 'closed', reason, specialLabel: todaySpecial?.label };
  const day = next.dayOffset === 0 ? 'today' : next.dayOffset === 1 ? 'tomorrow' : addDays(clock.date, next.dayOffset).weekday;
  return {
    kind: 'closed',
    reason,
    specialLabel: todaySpecial?.label,
    opensAt: { time: next.open, day },
    minutesUntil: next.start - t,
  };
}

/** Short human label, e.g. "Open · closes 10:30pm", "Closed · opens 7am tomorrow". */
export function statusLabel(s: OpenStatus): { headline: string; detail: string } {
  if (s.kind === 'open') {
    return {
      headline: s.closingSoon ? 'Closing soon' : 'Open now',
      detail: `closes ${formatTime(s.closesAt)}`,
    };
  }
  if (s.reason === 'temporary') return { headline: 'Temporarily closed', detail: s.message ?? '' };
  const prefix = s.reason === 'special' && s.specialLabel ? `Closed for ${s.specialLabel}` : 'Closed';
  if (!s.opensAt) return { headline: prefix, detail: '' };
  const when =
    s.opensAt.day === 'today' ? '' : s.opensAt.day === 'tomorrow' ? ' tomorrow' : ` ${WEEKDAY_NAMES[s.opensAt.day]}`;
  return { headline: prefix, detail: `opens ${formatTime(s.opensAt.time)}${when}` };
}

/** "2h 14m", "45m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h >= 24) return `${Math.round(h / 24)}d`;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** Groups identical days: [{days: "Every day", hours: "7am–10:30pm"}] or per-run of weekdays. */
export function weeklySummary(hours: Branch['hours']): { days: string; hours: string }[] {
  const key = (d: Weekday) => (hours[d].length ? hours[d].map(formatRange).join(', ') : 'Closed');
  const runs: { from: Weekday; to: Weekday; value: string }[] = [];
  for (const d of WEEKDAYS) {
    const v = key(d);
    const last = runs[runs.length - 1];
    if (last && last.value === v) last.to = d;
    else runs.push({ from: d, to: d, value: v });
  }
  if (runs.length === 1) return [{ days: 'Every day', hours: runs[0].value }];
  const short = (d: Weekday) => WEEKDAY_NAMES[d].slice(0, 3);
  return runs.map((r) => ({ days: r.from === r.to ? short(r.from) : `${short(r.from)}–${short(r.to)}`, hours: r.value }));
}

/** Whether a menu category is being served at this Bali time (ignores the café's own hours). */
export function servingState(
  category: Pick<Category, 'servedFrom' | 'servedUntil'>,
  now: Date = new Date(),
): 'always' | 'now' | 'later' | 'ended' {
  if (!category.servedFrom && !category.servedUntil) return 'always';
  const t = baliClock(now).minutes;
  const from = category.servedFrom ? toMinutes(category.servedFrom) : 0;
  const until = category.servedUntil ? toMinutes(category.servedUntil) : DAY;
  if (t < from) return 'later';
  if (t >= until) return 'ended';
  return 'now';
}

export function servingLabel(category: Pick<Category, 'servedFrom' | 'servedUntil'>): string | null {
  const { servedFrom: f, servedUntil: u } = category;
  if (f && u) return `Served ${formatTime(f)}–${formatTime(u)}`;
  if (f) return `From ${formatTime(f)}`;
  if (u) return `Until ${formatTime(u)}`;
  return null;
}
