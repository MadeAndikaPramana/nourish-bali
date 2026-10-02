import type { ReactNode, InputHTMLAttributes } from 'react';

/** Small form primitives for the admin. Big touch targets: staff will use this on a phone. */

export function Field({ label, hint, children, className = '' }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'h-11 w-full rounded-xl bg-white px-3 text-[0.95rem] ring-1 ring-line outline-none transition focus:ring-2 focus:ring-accent disabled:opacity-50';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function TextArea({ value, onChange, rows = 2, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl bg-white p-3 text-[0.95rem] ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
    />
  );
}

export function Toggle({ checked, onChange, label, tone = 'accent' }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; tone?: 'accent' | 'danger' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 items-center gap-3 rounded-xl text-left text-sm font-semibold"
    >
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? (tone === 'danger' ? 'bg-rose-600' : 'bg-accent') : 'bg-ink/15'}`}
        aria-hidden="true"
      >
        <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </span>
      <span>{label}</span>
    </button>
  );
}

export function Button({
  children,
  onClick,
  variant = 'ghost',
  disabled,
  type = 'button',
  className = '',
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'ink' | 'accent' | 'ghost' | 'danger' | 'quiet';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  title?: string;
}) {
  const v = {
    ink: 'btn btn-ink',
    accent: 'btn btn-accent',
    ghost: 'btn btn-ghost',
    danger: 'btn bg-rose-600 text-white hover:bg-rose-700',
    quiet: 'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-muted hover:bg-ink/5 hover:text-ink',
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={`${v} disabled:pointer-events-none disabled:opacity-40 ${className}`}>
      {children}
    </button>
  );
}

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl bg-cream p-4 ring-1 ring-line sm:p-6 ${className}`}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="display text-xl sm:text-2xl">{title}</h2>}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; branch?: string }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-ink/5 p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          data-branch={o.branch}
          onClick={() => onChange(o.value)}
          className={`min-h-10 rounded-xl px-3.5 text-sm font-bold transition-colors ${value === o.value ? 'bg-accent text-white shadow-sm' : 'hover:bg-white/70'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Thousand-rupiah amount input: shows "K" suffix, accepts decimals for e.g. 32.5K. */
export function AmountInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <span className="relative inline-flex w-24 items-center">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={0.5}
        aria-label={label}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className={`${inputCls} !h-10 pr-7 text-right tabular-nums`}
      />
      <span className="pointer-events-none absolute right-2.5 text-sm font-bold text-muted">K</span>
    </span>
  );
}
