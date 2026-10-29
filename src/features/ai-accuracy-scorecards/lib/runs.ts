import { formatLongDay, formatLongMonth } from "./format";
import type { Releases } from "../model/releases";
import type {
  BenchmarkPage,
  BenchmarkRunRef,
  TrendPoint,
} from "../model/types";

type Runs = readonly [BenchmarkRunRef, ...BenchmarkRunRef[]];

const RUN_ID = /^(\d{4})(\d{2})(\d{2})T\d{6}Z_/;
const COMMIT_SHA = /^[0-9a-f]{40}$/;

/**
 * The released runs, oldest first, each named by the month in its run id;
 * every release in a month that has more than one is named by its day.
 * Throws on a run id that is not a gnw-gold-evals one, a ref that is not a
 * full commit sha, or a run released twice.
 */
export function releasedRuns(releases: Releases): Runs {
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
    const day = `${match[1]}-${match[2]}-${match[3]}`;
    return { release, day, month: formatLongMonth(day) };
  });
  // Mapping keeps the length, so the list is still non-empty.
  return dated
    .map(({ release, day, month }) => ({
      ...release,
      label:
        dated.filter((d) => d.month === month).length > 1
          ? formatLongDay(day)
          : month,
    }))
    .sort((a, b) => a.runId.localeCompare(b.runId)) as unknown as Runs;
}

/**
 * The run the page opens on: the requested one when it is released, else
 * the newest release. Runs come oldest first.
 */
export function pickRun(runs: Runs, requested: string | null): BenchmarkRunRef {
  return runs.find((r) => r.runId === requested) ?? runs[runs.length - 1];
}

/**
 * The trend's points: the headline of each loaded page of `version`, in
 * the pages' order. Rates are only comparable within a version.
 */
export function trendPoints(
  pages: readonly (BenchmarkPage | undefined)[],
  version: string
): TrendPoint[] {
  return pages.flatMap((p) =>
    p?.benchmark.version !== version || p.summary.everyTime == null
      ? []
      : [
          {
            runId: p.run.runId,
            started: p.run.started,
            draft: p.run.draft,
            everyTime: p.summary.everyTime,
            majority: p.summary.majority,
            anyTime: p.summary.anyTime,
          },
        ]
  );
}

/**
 * Months since 1 Sep 2026 (the trend axis origin), with the day as a
 * fraction of the month: "2026-10-23..." -> about 1.7.
 */
export function monthsSinceOrigin(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return (year - 2026) * 12 + (month - 9) + (day - 1) / 30;
}
