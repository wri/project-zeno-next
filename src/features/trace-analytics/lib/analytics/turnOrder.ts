/**
 * In-conversation turn ordering. Prefers the server-stored `turnIndex` (the
 * true 1-based position, correct even when the fetch window cuts a thread
 * mid-way) and falls back to timestamps for rows ingested before the
 * turn-index backfill.
 */

import type { TraceRow } from "../../model/types";

/** Sort comparator: earlier turn first. Rows lacking both signals keep order. */
export function compareTurnOrder(a: TraceRow, b: TraceRow): number {
  if (a.turnIndex != null && b.turnIndex != null) {
    return a.turnIndex - b.turnIndex;
  }
  if (a.turnIndex != null) return -1;
  if (b.turnIndex != null) return 1;
  return String(a.timestamp ?? "").localeCompare(String(b.timestamp ?? ""));
}

/** Strictly-before test for two turns of the same conversation. */
export function isEarlierTurn(a: TraceRow, b: TraceRow): boolean {
  if (a.turnIndex != null && b.turnIndex != null) {
    return a.turnIndex < b.turnIndex;
  }
  if (a.timestamp && b.timestamp) return a.timestamp < b.timestamp;
  return false;
}
