/**
 * Signed, thousands-separated, two significant digits — the design prints
 * every value with an explicit sign so a reader never has to infer direction
 * from colour alone, and rounds hard (`-750`, `+1600`) because every flux
 * figure is a modelled estimate: `+1,694` reads as more certainty than the
 * data has. Shared across the curated LGMS charts (headline, value column,
 * tooltips) so they can never drift apart.
 */
export const signed = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 2,
  signDisplay: "always",
});

const COMPACT = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** "8.4M"; undefined for non-positive or non-numeric input. */
export function formatCompactNumber(value: unknown): string | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return COMPACT.format(n);
}
