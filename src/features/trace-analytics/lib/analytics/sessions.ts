/** Conversation-depth aggregates: prompts (turns) per session. */

import type { TraceRow } from "../../model/types";
import { mean, median, quantile } from "./stats";

export interface SessionDepth {
  readonly sessionCount: number;
  /** One entry per session: number of prompts observed in the window. */
  readonly turnsPerSession: readonly number[];
  readonly meanTurns: number;
  readonly medianTurns: number;
  readonly p95Turns: number;
  readonly maxTurns: number;
  /** Share of sessions with exactly one prompt. */
  readonly singleTurnShare: number;
}

/** Group prompts by session and summarise conversation depth. */
export function computeSessionDepth(rows: readonly TraceRow[]): SessionDepth {
  const bySession = new Map<string, number>();
  for (const row of rows) {
    const sessionId = String(row.sessionId ?? "").trim();
    if (!sessionId) continue;
    bySession.set(sessionId, (bySession.get(sessionId) ?? 0) + 1);
  }

  const turnsPerSession = [...bySession.values()];
  const singleTurn = turnsPerSession.filter((n) => n === 1).length;
  return {
    sessionCount: turnsPerSession.length,
    turnsPerSession,
    meanTurns: mean(turnsPerSession),
    medianTurns: median(turnsPerSession),
    p95Turns: quantile(turnsPerSession, 0.95),
    maxTurns: turnsPerSession.length ? Math.max(...turnsPerSession) : 0,
    singleTurnShare: turnsPerSession.length
      ? singleTurn / turnsPerSession.length
      : 0,
  };
}
