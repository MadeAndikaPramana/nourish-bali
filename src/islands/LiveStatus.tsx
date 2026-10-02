import { useEffect, useState } from 'react';
import { formatDuration, getStatus, statusLabel, type OpenStatus } from '@/lib/hours';
import type { Branch } from '@/lib/schema';

type HoursProps = Pick<Branch, 'hours' | 'specialDays' | 'temporarilyClosed'>;

interface Props {
  branch: HoursProps;
  /** What to show before hydration (computed from hours, never a stale open/closed claim). */
  fallback: string;
  variant?: 'pill' | 'inline' | 'hero';
  countdown?: boolean;
  className?: string;
}

/** Hook: status in Bali time, refreshed every 30s and whenever the tab becomes visible again. */
export function useOpenStatus(branch: HoursProps) {
  const [status, setStatus] = useState<OpenStatus | null>(null);
  useEffect(() => {
    const update = () => setStatus(getStatus(branch));
    update();
    const id = setInterval(update, 30_000);
    const onVis = () => document.visibilityState === 'visible' && update();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [branch]);
  return status;
}

export default function LiveStatus({ branch, fallback, variant = 'pill', countdown = false, className = '' }: Props) {
  const status = useOpenStatus(branch);

  if (!status) {
    return (
      <span className={`${base(variant)} ${className}`} data-state="unknown">
        <span className="size-2 rounded-full bg-current opacity-40" aria-hidden="true" />
        <span>{fallback}</span>
      </span>
    );
  }

  const { headline, detail } = statusLabel(status);
  const state = status.kind === 'open' ? (status.closingSoon ? 'soon' : 'open') : 'closed';
  const extra =
    countdown && status.kind === 'open'
      ? ` · ${formatDuration(status.minutesLeft)} left`
      : countdown && status.kind === 'closed' && status.minutesUntil !== undefined && status.minutesUntil < 12 * 60
        ? ` · in ${formatDuration(status.minutesUntil)}`
        : '';

  return (
    <span className={`${base(variant)} ${className}`} data-state={state} role="status" aria-live="polite">
      <span className="relative flex size-2" aria-hidden="true">
        {state !== 'closed' && <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${dot(state)}`} />}
        <span className={`relative inline-flex size-2 rounded-full ${dot(state)}`} />
      </span>
      <span>
        <strong className="font-bold">{headline}</strong>
        {detail && <span className="opacity-75"> · {detail}</span>}
        {extra && <span className="opacity-60">{extra}</span>}
      </span>
    </span>
  );
}

const dot = (s: string) => (s === 'open' ? 'bg-emerald-500' : s === 'soon' ? 'bg-amber-500' : 'bg-rose-500');

const base = (v: Props['variant']) =>
  v === 'inline'
    ? 'inline-flex items-center gap-2 text-sm'
    : v === 'hero'
      ? 'inline-flex items-center gap-2.5 rounded-full bg-white/85 px-3.5 py-2 text-sm text-ink shadow-sm ring-1 ring-black/5 backdrop-blur'
      : 'inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[0.8rem] text-ink ring-1 ring-black/5 backdrop-blur';
