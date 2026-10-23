import type { BenchmarkRunRef } from "../model/types";

/**
 * The run the page opens on: the requested one when it exists, else the
 * newest canonical run, else the newest run with page data.
 */
export function pickRun(
  runs: readonly BenchmarkRunRef[],
  requested: string | null
): BenchmarkRunRef | null {
  if (requested) {
    const match = runs.find((r) => r.runId === requested);
    if (match) return match;
  }
  const newestFirst = [...runs].sort((a, b) => b.runId.localeCompare(a.runId));
  return newestFirst.find((r) => r.canonical) ?? newestFirst[0] ?? null;
}

/** Trend points: the canonical runs of one version, oldest first. Rates
 * are only comparable within a version. */
export function trendRuns(
  runs: readonly BenchmarkRunRef[],
  version: string
): BenchmarkRunRef[] {
  return runs
    .filter((r) => r.version === version && r.canonical)
    .sort((a, b) => a.runId.localeCompare(b.runId));
}

/**
 * Months since 1 Sep 2026 (the trend axis origin), with the day as a
 * fraction of the month: "2026-10-23..." -> about 1.7.
 */
export function monthsSinceOrigin(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return (year - 2026) * 12 + (month - 9) + (day - 1) / 30;
}
