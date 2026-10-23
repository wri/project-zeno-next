import type { BenchmarkRunRef } from "../model/types";

/**
 * The run the page opens on: the requested one when it exists, else the
 * newest canonical run, else the newest run with page data. Runs come
 * oldest first (the gateway's contract).
 */
export function pickRun(
  runs: readonly BenchmarkRunRef[],
  requested: string | null
): BenchmarkRunRef | null {
  return (
    runs.find((r) => r.runId === requested) ??
    runs.findLast((r) => r.canonical) ??
    runs.at(-1) ??
    null
  );
}

/** Trend points: the canonical runs of one version, oldest first. Rates
 * are only comparable within a version. */
export function trendRuns(
  runs: readonly BenchmarkRunRef[],
  version: string
): BenchmarkRunRef[] {
  return runs.filter((r) => r.version === version && r.canonical);
}

/**
 * Months since 1 Sep 2026 (the trend axis origin), with the day as a
 * fraction of the month: "2026-10-23..." -> about 1.7.
 */
export function monthsSinceOrigin(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return (year - 2026) * 12 + (month - 9) + (day - 1) / 30;
}
