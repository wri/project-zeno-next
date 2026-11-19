import { differenceInCalendarMonths, getDate } from "date-fns";
import { calendarDate } from "./format";
import type { Release } from "../model/releases";
import type { BenchmarkPage, TrendPoint } from "../model/types";

/**
 * The released runs, oldest first (a run id starts with its timestamp).
 * The list's shape (names, run ids, full commit shas, each name and run
 * once) is checked by a unit test over RELEASES.
 */
export function releasedRuns(releases: readonly Release[]): Release[] {
  return [...releases].sort((a, b) => a.runId.localeCompare(b.runId));
}

/**
 * The trend's points: the headline of each loaded page, in the pages'
 * order, whatever its benchmark version (AJ, 2026-11-19). Each point
 * carries the number of questions it scored, because the sets differ
 * slightly between versions.
 */
export function trendPoints(
  pages: readonly (BenchmarkPage | undefined)[]
): TrendPoint[] {
  return pages.flatMap((p) => {
    // The page data nulls the three shares together, and only when nothing
    // was scored: such a run has no headline to plot.
    const { everyTime, majority, anyTime } = p?.summary ?? {};
    if (!p || everyTime == null || majority == null || anyTime == null) {
      return [];
    }
    return [
      {
        runId: p.run.runId,
        started: p.run.started,
        draft: p.run.draft,
        scored: p.summary.scored,
        everyTime,
        majority,
        anyTime,
      },
    ];
  });
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
