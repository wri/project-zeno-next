/** Usage rhythm — trace counts by UTC hour of day × weekday. */

import type { TraceRow } from "../../model/types";

export interface HourlyActivityCell {
  /** 0 = Monday … 6 = Sunday. */
  readonly weekday: number;
  /** 0–23, UTC. */
  readonly hour: number;
  readonly count: number;
}

export interface HourlyActivity {
  /** Dense 7×24 grid, Monday first, hour ascending. */
  readonly cells: readonly HourlyActivityCell[];
  readonly maxCount: number;
  /** Traces with a parseable timestamp. */
  readonly total: number;
}

/** Count traces into a Monday-start weekday × UTC-hour grid. */
export function computeHourlyActivity(
  rows: readonly TraceRow[]
): HourlyActivity {
  const counts = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  let total = 0;
  for (const row of rows) {
    if (!row.timestamp) continue;
    const dt = new Date(row.timestamp);
    if (Number.isNaN(dt.getTime())) continue;
    const weekday = (dt.getUTCDay() + 6) % 7;
    counts[weekday][dt.getUTCHours()] += 1;
    total += 1;
  }

  const cells = counts.flatMap((hours, weekday) =>
    hours.map((count, hour) => ({ weekday, hour, count }))
  );
  const maxCount = cells.reduce((acc, c) => Math.max(acc, c.count), 0);
  return { cells, maxCount, total };
}
