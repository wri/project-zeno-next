import { differenceInCalendarMonths, format, getDate, parse } from "date-fns";
import { calendarDate } from "./format";
import type { Release } from "../model/releases";
import type {
  BenchmarkPage,
  BenchmarkRunRef,
  TrendPoint,
} from "../model/types";

/** A release name spelled out: "oct-2026" -> "October 2026". */
function releaseLabel(name: string): string {
  return format(parse(name, "MMM-yyyy", new Date(0)), "MMMM yyyy");
}

/**
 * The released runs, oldest first (a run id starts with its timestamp),
 * each labelled from its release name. The list's shape (names, run ids,
 * full commit shas, each name and run once) is checked by a unit test
 * over RELEASES.
 */
export function releasedRuns(releases: readonly Release[]): BenchmarkRunRef[] {
  return releases
    .map((release) => ({ ...release, label: releaseLabel(release.name) }))
    .sort((a, b) => a.runId.localeCompare(b.runId));
}

/**
 * The run that fills the page: the newest release (AJ, 2026-11-19). Older
 * releases show only as points on the trend. Runs come oldest first, and
 * RELEASES is never empty.
 */
export function newestRun(runs: readonly BenchmarkRunRef[]): BenchmarkRunRef {
  return runs[runs.length - 1];
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
