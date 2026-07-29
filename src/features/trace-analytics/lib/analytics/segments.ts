/**
 * User segmentation — two independent dimensions (port of user_segments.py).
 *
 * Dimension 1 — Acquisition:
 *   New: first-ever activity on or after the window start.
 *   Returning: first-ever activity before the window start.
 *
 * Dimension 2 — Engagement:
 *   Engaged: ≥2 sessions, each containing ≥2 prompts, within the window.
 *   Not engaged: everyone else.
 */

import type { TraceRow } from "../../model/types";

/** Map of user id → first-seen ISO date (YYYY-MM-DD). */
export type FirstSeenMap = ReadonlyMap<string, string>;

export interface UserSegments {
  readonly firstSeenByUser: FirstSeenMap;
  readonly newUsers: ReadonlySet<string>;
  readonly returningUsers: ReadonlySet<string>;
  readonly engagedUsers: ReadonlySet<string>;
  readonly notEngagedUsers: ReadonlySet<string>;
  readonly unknownUsers: ReadonlySet<string>;
  readonly filledFromWindow: number;
}

function cleanId(value: unknown): string {
  return String(value ?? "").trim();
}

/** Distinct non-empty user ids present in the rows. */
export function activeUserIds(rows: readonly TraceRow[]): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = cleanId(row.userId);
    if (id) ids.add(id);
  }
  return ids;
}

/** Users with ≥minSessions sessions each having ≥minPromptsPerSession prompts. */
export function computeEngagedUsers(
  rows: readonly TraceRow[],
  minSessions = 2,
  minPromptsPerSession = 2
): Set<string> {
  const promptsPerSession = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const userId = cleanId(row.userId);
    const sessionId = cleanId(row.sessionId);
    if (!userId || !sessionId) continue;
    const sessions = promptsPerSession.get(userId) ?? new Map<string, number>();
    sessions.set(sessionId, (sessions.get(sessionId) ?? 0) + 1);
    promptsPerSession.set(userId, sessions);
  }

  const engaged = new Set<string>();
  for (const [userId, sessions] of promptsPerSession) {
    let goodSessions = 0;
    for (const count of sessions.values()) {
      if (count >= minPromptsPerSession) goodSessions += 1;
    }
    if (goodSessions >= minSessions) engaged.add(userId);
  }
  return engaged;
}

export interface FirstSeenLookupResult {
  readonly firstSeenByUser: FirstSeenMap;
  readonly filledFromWindow: number;
}

/**
 * Build a {userId → firstSeenDate} map for every active user.
 * 1. Start with the authoritative map (from the GNW users API).
 * 2. Back-fill users missing from it with their earliest date in the window.
 */
export function buildFirstSeenLookup(
  rows: readonly TraceRow[],
  authoritative: FirstSeenMap | null
): FirstSeenLookupResult {
  const active = activeUserIds(rows);
  const firstSeen = new Map<string, string>();

  if (authoritative) {
    for (const [userId, date] of authoritative) {
      const id = cleanId(userId);
      if (id && active.has(id) && date) firstSeen.set(id, date);
    }
  }

  let filled = 0;
  for (const row of rows) {
    const id = cleanId(row.userId);
    if (!id || !row.date || firstSeen.has(id)) continue;
    firstSeen.set(id, row.date);
    filled += 1;
  }
  // Later rows may have earlier dates than the first back-fill — take the min.
  for (const row of rows) {
    const id = cleanId(row.userId);
    if (!id || !row.date) continue;
    if (authoritative?.has(id)) continue;
    const current = firstSeen.get(id);
    if (current && row.date < current) firstSeen.set(id, row.date);
  }

  return { firstSeenByUser: firstSeen, filledFromWindow: filled };
}

/** Classify active users along both dimensions. */
export function classifyUserSegments(
  rows: readonly TraceRow[],
  authoritative: FirstSeenMap | null,
  startDate: string,
  endDate: string
): UserSegments {
  const { firstSeenByUser, filledFromWindow } = buildFirstSeenLookup(
    rows,
    authoritative
  );
  const active = activeUserIds(rows);
  const known = new Set(firstSeenByUser.keys());
  const unknown = new Set([...active].filter((u) => !known.has(u)));

  const newUsers = new Set<string>();
  const returningUsers = new Set<string>();
  for (const [userId, firstSeen] of firstSeenByUser) {
    if (firstSeen >= startDate && firstSeen <= endDate) {
      newUsers.add(userId);
    } else if (firstSeen < startDate) {
      returningUsers.add(userId);
    }
  }

  const engagedUsers = computeEngagedUsers(rows);
  const notEngagedUsers = new Set(
    [...known].filter((u) => !engagedUsers.has(u) && !unknown.has(u))
  );

  return {
    firstSeenByUser,
    newUsers,
    returningUsers,
    engagedUsers,
    notEngagedUsers,
    unknownUsers: unknown,
    filledFromWindow,
  };
}

export interface DailyUserSegments {
  readonly date: string;
  readonly newUsers: number;
  readonly returningUsers: number;
  readonly engagedUsers: number;
  readonly notEngagedUsers: number;
}

/**
 * Per-day segment counts. A user counts as "new" only on the day matching
 * their first-seen date; each dimension sums to that day's distinct users.
 */
export function buildDailyUserSegments(
  rows: readonly TraceRow[],
  firstSeenByUser: FirstSeenMap,
  engagedUsers: ReadonlySet<string>
): DailyUserSegments[] {
  const usersByDate = new Map<string, Set<string>>();
  for (const row of rows) {
    const id = cleanId(row.userId);
    if (!id || !row.date) continue;
    const set = usersByDate.get(row.date) ?? new Set<string>();
    set.add(id);
    usersByDate.set(row.date, set);
  }

  return [...usersByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, users]) => {
      let newCount = 0;
      let returningCount = 0;
      let engagedCount = 0;
      let notEngagedCount = 0;
      for (const userId of users) {
        const firstSeen = firstSeenByUser.get(userId);
        if (!firstSeen) continue; // unknown users are excluded, as in tracey
        if (firstSeen === date) {
          newCount += 1;
        } else {
          returningCount += 1;
        }
        if (engagedUsers.has(userId)) {
          engagedCount += 1;
        } else {
          notEngagedCount += 1;
        }
      }
      return {
        date,
        newUsers: newCount,
        returningUsers: returningCount,
        engagedUsers: engagedCount,
        notEngagedUsers: notEngagedCount,
      };
    });
}
