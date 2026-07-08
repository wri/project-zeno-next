/** Numeric statistics helpers (pandas-equivalent semantics). */

export function mean(values: readonly number[]): number {
  if (!values.length) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export function sum(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function max(values: readonly number[]): number {
  if (!values.length) return 0;
  return values.reduce((acc, v) => (v > acc ? v : acc), -Infinity);
}

/**
 * Quantile with linear interpolation between closest ranks — the same method
 * pandas' `Series.quantile` uses, so numbers match tracey's reports.
 */
export function quantile(values: readonly number[], q: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sorted[lower];
  const weight = pos - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function median(values: readonly number[]): number {
  return quantile(values, 0.5);
}

/** Keep only finite numbers (drops null/undefined/NaN). */
export function finiteNumbers(
  values: readonly (number | null | undefined)[]
): number[] {
  return values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v)
  );
}

export interface HistogramBin {
  readonly binStart: number;
  readonly binEnd: number;
  readonly count: number;
}

/** Round a raw step to a "nice" 1/2/5 × 10^k value (like d3/vega binning). */
function niceStep(rawStep: number): number {
  if (rawStep <= 0) return 1;
  const power = Math.floor(Math.log10(rawStep));
  const base = 10 ** power;
  const fraction = rawStep / base;
  if (fraction <= 1) return base;
  if (fraction <= 2) return 2 * base;
  if (fraction <= 5) return 5 * base;
  return 10 * base;
}

export interface BinOptions {
  /** Force whole-number bin edges with step ≥ 1 (for count-like data). */
  readonly integer?: boolean;
}

/**
 * Bin values into at most maxBins nice-width bins. Bins are half-open
 * [start, end) except the last, which includes its end.
 */
export function binValues(
  values: readonly number[],
  maxBins = 30,
  options: BinOptions = {}
): HistogramBin[] {
  const finite = finiteNumbers(values);
  if (!finite.length) return [];

  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  if (lo === hi) {
    return [{ binStart: lo, binEnd: hi, count: finite.length }];
  }

  const rawStep = niceStep((hi - lo) / maxBins);
  const step = options.integer ? Math.max(1, Math.ceil(rawStep)) : rawStep;
  const start = Math.floor(lo / step) * step;
  // Integer bins are exact [n, n+step) buckets, so the max needs its own bin;
  // continuous bins fold the max into the final bin instead.
  const binCount = options.integer
    ? Math.floor((hi - start) / step) + 1
    : Math.max(1, Math.ceil((hi - start) / step));

  const counts = new Array<number>(binCount).fill(0);
  for (const v of finite) {
    const idx = Math.min(binCount - 1, Math.floor((v - start) / step));
    counts[idx] += 1;
  }

  return counts.map((count, i) => ({
    binStart: start + i * step,
    binEnd: start + (i + 1) * step,
    count,
  }));
}
