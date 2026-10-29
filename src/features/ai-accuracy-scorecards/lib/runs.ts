import type { Release } from "../model/releases";
import type { BenchmarkRunRef } from "../model/types";

const RUN_ID = /^(\d{4})(\d{2})(\d{2})T\d{6}Z_/;
const COMMIT_SHA = /^[0-9a-f]{40}$/;

const MONTH = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * The released runs, oldest first, each named by the month in its run id;
 * every release in a month that has more than one is named by its day.
 * Throws on a run id that is not a gnw-gold-evals one, a ref that is not a
 * full commit sha, or a run released twice.
 */
export function releasedRuns(releases: readonly Release[]): BenchmarkRunRef[] {
  const seen = new Set<string>();
  const dated = releases.map((release) => {
    const match = RUN_ID.exec(release.runId);
    if (!match) throw new Error(`release ${release.runId}: not a run id`);
    if (!COMMIT_SHA.test(release.ref)) {
      throw new Error(`release ${release.runId}: ref is not a commit sha`);
    }
    if (seen.has(release.runId)) {
      throw new Error(`release ${release.runId}: listed twice`);
    }
    seen.add(release.runId);
    const [, year, month, day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return { release, date, month: MONTH.format(date) };
  });
  const perMonth = new Map<string, number>();
  for (const { month } of dated) {
    perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
  }
  return dated
    .map(({ release, date, month }) => ({
      runId: release.runId,
      label: perMonth.get(month)! > 1 ? DAY.format(date) : month,
      ref: release.ref,
      draft: release.draft,
    }))
    .sort((a, b) => a.runId.localeCompare(b.runId));
}

/**
 * The run the page opens on: the requested one when it is released, else
 * the newest release. Runs come oldest first.
 */
export function pickRun(
  runs: readonly BenchmarkRunRef[],
  requested: string | null
): BenchmarkRunRef | null {
  return runs.find((r) => r.runId === requested) ?? runs.at(-1) ?? null;
}

/**
 * Months since 1 Sep 2026 (the trend axis origin), with the day as a
 * fraction of the month: "2026-10-23..." -> about 1.7.
 */
export function monthsSinceOrigin(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return (year - 2026) * 12 + (month - 9) + (day - 1) / 30;
}
