import { describe, expect, it } from 'vitest';
import { baliClock, formatTime, getStatus, servingState, statusLabel, weeklySummary } from '@/lib/hours';
import type { Branch } from '@/lib/schema';

const everyDay = (open: string, close: string) =>
  Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, [{ open, close }]])) as Branch['hours'];

const branch = (hours = everyDay('07:00', '22:30'), extra: Partial<Branch> = {}) =>
  ({ hours, specialDays: [], temporarilyClosed: { active: false, message: '' }, ...extra }) as Pick<
    Branch,
    'hours' | 'specialDays' | 'temporarilyClosed'
  >;

/** Build a Date from a Bali wall-clock time (WITA = UTC+8). */
const bali = (iso: string) => new Date(`${iso}+08:00`);

describe('baliClock', () => {
  it('converts UTC to WITA, including the date rollover', () => {
    // 2026-10-02 17:30 UTC = 2026-10-03 01:30 in Bali (a Saturday)
    const c = baliClock(new Date('2026-10-02T17:30:00Z'));
    expect(c).toEqual({ date: '2026-10-03', weekday: 'sat', minutes: 90 });
  });
});

describe('getStatus', () => {
  it('is open mid-day and reports closing time', () => {
    const s = getStatus(branch(), bali('2026-10-02T12:00:00'));
    expect(s).toMatchObject({ kind: 'open', closesAt: '22:30', closingSoon: false, minutesLeft: 630 });
  });

  it('flags closing soon in the last 30 minutes', () => {
    const s = getStatus(branch(), bali('2026-10-02T22:05:00'));
    expect(s).toMatchObject({ kind: 'open', closingSoon: true, minutesLeft: 25 });
    expect(statusLabel(s).headline).toBe('Closing soon');
  });

  it('is closed exactly at closing time and opens tomorrow', () => {
    const s = getStatus(branch(), bali('2026-10-02T22:30:00'));
    expect(s).toMatchObject({ kind: 'closed', reason: 'hours', opensAt: { time: '07:00', day: 'tomorrow' } });
    expect(statusLabel(s)).toEqual({ headline: 'Closed', detail: 'opens 7am tomorrow' });
  });

  it('before opening says "opens today"', () => {
    const s = getStatus(branch(), bali('2026-10-02T06:15:00'));
    expect(s).toMatchObject({ kind: 'closed', opensAt: { day: 'today' }, minutesUntil: 45 });
    expect(statusLabel(s).detail).toBe('opens 7am');
  });

  it('handles ranges that cross midnight', () => {
    const late = branch(everyDay('18:00', '02:00'));
    expect(getStatus(late, bali('2026-10-03T01:00:00'))).toMatchObject({ kind: 'open', closesAt: '02:00', minutesLeft: 60 });
    expect(getStatus(late, bali('2026-10-03T02:00:00'))).toMatchObject({ kind: 'closed', opensAt: { day: 'today' } });
  });

  it('closes for a special day (e.g. Nyepi) and names it', () => {
    const b = branch(undefined, { specialDays: [{ date: '2027-03-09', label: 'Nyepi', hours: [] }] });
    const s = getStatus(b, bali('2027-03-09T10:00:00'));
    expect(s).toMatchObject({ kind: 'closed', reason: 'special', opensAt: { day: 'tomorrow' } });
    expect(statusLabel(s).headline).toBe('Closed for Nyepi');
  });

  it('uses special-day hours instead of the weekly ones', () => {
    const b = branch(undefined, { specialDays: [{ date: '2026-12-25', label: 'Christmas', hours: [{ open: '09:00', close: '15:00' }] }] });
    expect(getStatus(b, bali('2026-12-25T08:00:00'))).toMatchObject({ kind: 'closed', opensAt: { time: '09:00' } });
    expect(getStatus(b, bali('2026-12-25T16:00:00'))).toMatchObject({ kind: 'closed', opensAt: { day: 'tomorrow' } });
  });

  it('skips closed weekdays when finding the next opening', () => {
    const hours = everyDay('07:00', '16:00');
    hours.mon = [];
    // Sunday 2026-10-04 17:00 → Monday closed → opens Tuesday
    const s = getStatus(branch(hours), bali('2026-10-04T17:00:00'));
    expect(s).toMatchObject({ kind: 'closed', opensAt: { day: 'tue' } });
    expect(statusLabel(s).detail).toBe('opens 7am Tuesday');
  });

  it('temporarily closed overrides everything', () => {
    const b = branch(undefined, { temporarilyClosed: { active: true, message: 'Back on Monday' } });
    expect(statusLabel(getStatus(b, bali('2026-10-02T12:00:00')))).toEqual({ headline: 'Temporarily closed', detail: 'Back on Monday' });
  });
});

describe('formatting', () => {
  it('formats times for humans', () => {
    expect(formatTime('07:00')).toBe('7am');
    expect(formatTime('22:30')).toBe('10:30pm');
    expect(formatTime('12:00')).toBe('noon');
    expect(formatTime('24:00')).toBe('midnight');
  });

  it('summarises identical days', () => {
    expect(weeklySummary(everyDay('06:00', '21:00'))).toEqual([{ days: 'Every day', hours: '6am–9pm' }]);
    const h = everyDay('07:00', '22:30');
    h.sun = [];
    expect(weeklySummary(h)).toEqual([
      { days: 'Mon–Sat', hours: '7am–10:30pm' },
      { days: 'Sun', hours: 'Closed' },
    ]);
  });
});

describe('servingState', () => {
  const breakfast = { servedFrom: '07:00', servedUntil: '16:00' };
  it('knows when a menu section is served', () => {
    expect(servingState(breakfast, bali('2026-10-02T06:59:00'))).toBe('later');
    expect(servingState(breakfast, bali('2026-10-02T07:00:00'))).toBe('now');
    expect(servingState(breakfast, bali('2026-10-02T16:00:00'))).toBe('ended');
    expect(servingState({}, bali('2026-10-02T03:00:00'))).toBe('always');
  });
});
