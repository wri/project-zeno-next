/** Period-over-period comparison helpers for KPI deltas. */

import { inclusiveDays, shiftIsoDate } from "../format";

export interface DateRange {
  readonly startDate: string;
  readonly endDate: string;
}

/** The window of equal length immediately before [startDate, endDate]. */
export function previousRange(range: DateRange): DateRange {
  const days = inclusiveDays(range.startDate, range.endDate);
  return {
    startDate: shiftIsoDate(range.startDate, -days),
    endDate: shiftIsoDate(range.startDate, -1),
  };
}

export type DeltaDirection = "up" | "down" | "flat";

export interface KpiDelta {
  /** Human-readable delta, e.g. "+12.4%" or "+1.2pp". */
  readonly text: string;
  readonly direction: DeltaDirection;
  /** Whether this movement is good news (colors the badge). */
  readonly positive: boolean;
}

interface DeltaOptions {
  /** True when an increase is good (volume); false when it's bad (latency). */
  readonly upIsGood: boolean;
}

/** Relative change between two counts, e.g. traces vs the previous window. */
export function relativeDelta(
  current: number,
  previous: number,
  { upIsGood }: DeltaOptions
): KpiDelta | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  const change = (current - previous) / previous;
  if (Math.abs(change) < 0.0005) {
    return { text: "±0%", direction: "flat", positive: true };
  }
  const direction: DeltaDirection = change > 0 ? "up" : "down";
  return {
    text: `${change > 0 ? "+" : ""}${(change * 100).toFixed(1)}%`,
    direction,
    positive: change > 0 === upIsGood,
  };
}

/** Absolute change between two rates, reported in percentage points. */
export function percentagePointDelta(
  current: number,
  previous: number,
  { upIsGood }: DeltaOptions
): KpiDelta | null {
  if (!Number.isFinite(previous)) return null;
  const change = (current - previous) * 100;
  if (Math.abs(change) < 0.05) {
    return { text: "±0pp", direction: "flat", positive: true };
  }
  const direction: DeltaDirection = change > 0 ? "up" : "down";
  return {
    text: `${change > 0 ? "+" : ""}${change.toFixed(1)}pp`,
    direction,
    positive: change > 0 === upIsGood,
  };
}

/** Append a trailing N-day moving average for one numeric key. */
export function withMovingAverage<T extends Record<string, unknown>>(
  data: readonly T[],
  key: keyof T & string,
  windowSize = 7,
  outKey = `${key}Ma`
): (T & Record<string, number | null>)[] {
  return data.map((row, i) => {
    const from = Math.max(0, i - windowSize + 1);
    const slice = data.slice(from, i + 1);
    const values = slice
      .map((r) => Number(r[key]))
      .filter((v) => Number.isFinite(v));
    const ma =
      i + 1 >= windowSize && values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
    return { ...row, [outKey]: ma } as T & Record<string, number | null>;
  });
}
