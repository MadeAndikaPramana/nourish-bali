import type { Price } from './schema';

/** Menu amounts are thousands of rupiah: 85 → "85K". */
export const formatAmount = (amount: number) => `${Number.isInteger(amount) ? amount : amount.toFixed(1)}K`;

/** "85K", or "Sashimi tuna 135K · Grilled chicken 100K", or "60K | 85K" when unlabelled. */
export function formatPrices(prices: Price[]): string {
  if (prices.every((p) => !p.label)) return prices.map((p) => formatAmount(p.amount)).join(' | ');
  return prices.map((p) => (p.label ? `${p.label} ${formatAmount(p.amount)}` : formatAmount(p.amount))).join(' · ');
}

export const formatCount = (n: number) => n.toLocaleString('en-US');

/** "Fill Me Up Protein" stays; "BAGELS" → "Bagels". Menu names are stored in title case already. */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
