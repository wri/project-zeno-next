import { differenceInCalendarMonths, getDate } from "date-fns";
import { calendarDate, formatLongDay, formatLongMonth } from "./format";
import type { Release } from "../model/releases";
import type {
  BenchmarkPage,
  BenchmarkRunRef,
  TrendPoint,
} from "../model/types";

/**
 * The released runs, oldest first, each named by the month in its run id
 * ("20261028T…" is October 2026); every release in a month that has more
 * than one is named by its day. The list's shape (run ids, full commit
 * shas, each run once) is checked by a unit test over RELEASES.
 */
export function releasedRuns(releases: readonly Release[]): BenchmarkRunRef[] {
  const dated = releases.map((release) => {
    const id = release.runId;
    const day = `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}`;
    return { release, day, month: formatLongMonth(day) };
  });
  return dated
    .map(({ release, day, month }) => ({
      ...release,
      label:
        dated.filter((d) => d.month === month).length > 1
          ? formatLongDay(day)
          : month,
    }))
    .sort((a, b) => a.runId.localeCompare(b.runId));
}

/**
 * The run the page opens on: the requested one when it is released, else
 * the newest release. Runs come oldest first, and RELEASES is never empty.
 */
export function pickRun(
  runs: readonly BenchmarkRunRef[],
  requested: string | null
): BenchmarkRunRef {
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

/** The trend axis origin: 1 September 2026. */
const AXIS_ORIGIN = new Date(2026, 8, 1);

/**
 * Months since the trend axis origin, with the day as a fraction of the
 * month: "2026-10-23..." -> about 1.7.
 */
export function monthsSinceOrigin(iso: string): number {
  const date = calendarDate(iso);
  return (
    differenceInCalendarMonths(date, AXIS_ORIGIN) + (getDate(date) - 1) / 30
  );
}
