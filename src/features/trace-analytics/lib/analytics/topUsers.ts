/** Per-user activity aggregates for the "top users" product view. */

import type { TraceRow } from "../../model/types";

export interface UserActivity {
  readonly userId: string;
  readonly prompts: number;
  readonly sessions: number;
  readonly activeDays: number;
  /** Earliest activity date inside the window. */
  readonly firstActive: string | null;
  readonly lastActive: string | null;
  readonly successRate: number;
  /** ≥2 sessions each with ≥2 prompts, within the window. */
  readonly engaged: boolean;
}

/** Aggregate rows per user, sorted by prompt count descending. */
export function computeUserActivity(rows: readonly TraceRow[]): UserActivity[] {
  interface Accumulator {
    prompts: number;
    answers: number;
    sessions: Map<string, number>;
    days: Set<string>;
    firstActive: string | null;
    lastActive: string | null;
  }

  const byUser = new Map<string, Accumulator>();
  for (const row of rows) {
    const userId = row.userId.trim();
    if (!userId) continue;
    const acc =
      byUser.get(userId) ??
      ({
        prompts: 0,
        answers: 0,
        sessions: new Map<string, number>(),
        days: new Set<string>(),
        firstActive: null,
        lastActive: null,
      } satisfies Accumulator);

    acc.prompts += 1;
    if (row.outcome === "ANSWER") acc.answers += 1;
    const sessionId = String(row.sessionId ?? "").trim();
    if (sessionId) {
      acc.sessions.set(sessionId, (acc.sessions.get(sessionId) ?? 0) + 1);
    }
    if (row.date) {
      acc.days.add(row.date);
      if (!acc.firstActive || row.date < acc.firstActive)
        acc.firstActive = row.date;
      if (!acc.lastActive || row.date > acc.lastActive)
        acc.lastActive = row.date;
    }
    byUser.set(userId, acc);
  }

  return [...byUser.entries()]
    .map(([userId, acc]) => {
      const goodSessions = [...acc.sessions.values()].filter(
        (n) => n >= 2
      ).length;
      return {
        userId,
        prompts: acc.prompts,
        sessions: acc.sessions.size,
        activeDays: acc.days.size,
        firstActive: acc.firstActive,
        lastActive: acc.lastActive,
        successRate: acc.prompts ? acc.answers / acc.prompts : 0,
        engaged: goodSessions >= 2,
      };
    })
    .sort((a, b) => b.prompts - a.prompts || a.userId.localeCompare(b.userId));
}
