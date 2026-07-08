/**
 * Weekly cohort retention computed from the loaded trace window.
 *
 * Users are grouped into cohorts by the ISO week (Monday-start) of their
 * first-seen date. For each cohort, week N retention is the share of the
 * cohort active in the Nth week after their first week — measured within the
 * loaded window only, so cells outside the window are undefined rather than 0.
 */

import type { TraceRow } from "../../model/types";
import type { FirstSeenMap } from "./segments";

/** Monday-start week key (YYYY-MM-DD) for an ISO date. */
export function weekStartIso(isoDate: string): string {
  const dt = new Date(`${isoDate}T00:00:00Z`);
  const day = dt.getUTCDay(); // 0 = Sunday
  const sinceMonday = (day + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - sinceMonday);
  return dt.toISOString().slice(0, 10);
}

function weekIndexBetween(fromWeek: string, toWeek: string): number {
  const from = new Date(`${fromWeek}T00:00:00Z`).getTime();
  const to = new Date(`${toWeek}T00:00:00Z`).getTime();
  return Math.round((to - from) / (7 * 86_400_000));
}

export interface RetentionCell {
  /** Weeks since the cohort's first week (0 = the first week itself). */
  readonly offset: number;
  readonly activeUsers: number;
  /** activeUsers / cohort size. */
  readonly rate: number;
  /** False when the cell's week is not (fully or partly) inside the window. */
  readonly observed: boolean;
}

export interface RetentionCohort {
  /** Monday of the cohort week. */
  readonly cohortWeek: string;
  /** Users whose first-seen falls in this week AND who are active in the window. */
  readonly size: number;
  readonly cells: readonly RetentionCell[];
}

export interface RetentionResult {
  readonly cohorts: readonly RetentionCohort[];
  readonly maxOffset: number;
  /** Number of distinct activity weeks covered by the window. */
  readonly weeksInWindow: number;
}

/**
 * Build the weekly retention grid. `firstSeen` should be the authoritative
 * user → first-seen map (window back-fill is applied for unknown users).
 */
export function buildWeeklyRetention(
  rows: readonly TraceRow[],
  firstSeen: FirstSeenMap | null
): RetentionResult {
  // Activity: user → set of active week keys (window-scoped).
  const activityByUser = new Map<string, Set<string>>();
  const windowWeeks = new Set<string>();
  for (const row of rows) {
    const userId = row.userId.trim();
    if (!userId || !row.date) continue;
    const week = weekStartIso(row.date);
    windowWeeks.add(week);
    const weeks = activityByUser.get(userId) ?? new Set<string>();
    weeks.add(week);
    activityByUser.set(userId, weeks);
  }
  if (!activityByUser.size) {
    return { cohorts: [], maxOffset: 0, weeksInWindow: 0 };
  }

  const sortedWindowWeeks = [...windowWeeks].sort();
  const lastWindowWeek = sortedWindowWeeks[sortedWindowWeeks.length - 1];

  // Cohort assignment: authoritative first-seen, else earliest active week.
  const cohortByUser = new Map<string, string>();
  for (const [userId, weeks] of activityByUser) {
    const authoritative = firstSeen?.get(userId);
    const cohortWeek = authoritative
      ? weekStartIso(authoritative)
      : [...weeks].sort()[0];
    cohortByUser.set(userId, cohortWeek);
  }

  const usersByCohort = new Map<string, string[]>();
  for (const [userId, cohortWeek] of cohortByUser) {
    const users = usersByCohort.get(cohortWeek) ?? [];
    users.push(userId);
    usersByCohort.set(cohortWeek, users);
  }

  let maxOffset = 0;
  const cohorts = [...usersByCohort.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohortWeek, users]) => {
      const lastOffset = weekIndexBetween(cohortWeek, lastWindowWeek);
      const cells: RetentionCell[] = [];
      for (let offset = 0; offset <= Math.max(0, lastOffset); offset += 1) {
        const targetTime = new Date(`${cohortWeek}T00:00:00Z`);
        targetTime.setUTCDate(targetTime.getUTCDate() + offset * 7);
        const targetWeek = targetTime.toISOString().slice(0, 10);
        const observed = windowWeeks.has(targetWeek);
        const activeUsers = observed
          ? users.filter((u) => activityByUser.get(u)?.has(targetWeek)).length
          : 0;
        cells.push({
          offset,
          activeUsers,
          rate: users.length ? activeUsers / users.length : 0,
          observed,
        });
      }
      maxOffset = Math.max(maxOffset, cells.length - 1);
      return { cohortWeek, size: users.length, cells };
    });

  return { cohorts, maxOffset, weeksInWindow: windowWeeks.size };
}
