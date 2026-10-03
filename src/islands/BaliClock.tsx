import { useEffect, useState } from 'react';
import { baliClock } from '@/lib/hours';

/** "14:32 WITA". Renders a neutral placeholder at build time, real time after hydration. */
export default function BaliClock({ className = '' }: { className?: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const m = baliClock().minutes;
      setTime(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={className} title="Bali time (WITA, UTC+8)">
      <span className="tabular-nums">{time ?? '--:--'}</span> <span className="opacity-60">WITA</span>
    </span>
  );
}
