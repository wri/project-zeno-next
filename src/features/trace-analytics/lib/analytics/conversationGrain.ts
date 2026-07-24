/**
 * Conversation-grain aggregation: collapse per-turn trace rows into one
 * synthetic `TraceRow` per conversation, so every analytics computation that
 * consumes rows can run at either grain unchanged.
 *
 * Semantics of the collapsed row (documented in the UI toggle):
 * - identity/prompt/date come from the FIRST turn (a conversation is dated and
 *   named by its opening ask, matching /api/traces/sessions);
 * - `outcome` is the LAST turn's — how the conversation ended in the window;
 * - cost / tokens / tool calls are SUMS across turns; latency is the total
 *   agent time (`turnTokens === 0` still means "unknown" and is skipped);
 * - `datasetsAnalysed`, `hasInsight`, `aoiName`, `primaryDatasetName` take the
 *   latest thread-cumulative value, so they describe the whole conversation;
 * - `turnIndex` becomes the conversation's depth (highest position observed);
 * - rows without a sessionId are singleton conversations (the API gives them
 *   `turn_index` 1 the same way).
 *
 * A window that cuts a thread mid-way aggregates only the fetched turns —
 * same caveat as every other window-scoped metric in this dashboard.
 */

import type { TraceRow } from "../../model/types";
import { compareTurnOrder } from "./turnOrder";

/** Present = not null/undefined, and not the empty string for string fields. */
function isPresent<T>(value: T | null | undefined): value is T {
  if (value === null || value === undefined) return false;
  return typeof value !== "string" || value.trim() !== "";
}

function lastWhere<T>(
  turns: readonly TraceRow[],
  pick: (row: TraceRow) => T | null | undefined
): T | null {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const value = pick(turns[i]);
    if (isPresent(value)) return value;
  }
  return null;
}

function firstWhere<T>(
  turns: readonly TraceRow[],
  pick: (row: TraceRow) => T | null | undefined
): T | null {
  for (const turn of turns) {
    const value = pick(turn);
    if (isPresent(value)) return value;
  }
  return null;
}

/** Sum finite values; null when the group carries no signal at all. */
function sumOrNull(values: readonly (number | null)[]): number | null {
  const finite = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v)
  );
  return finite.length ? finite.reduce((a, b) => a + b, 0) : null;
}

/** Union of comma-joined dataset lists, first-seen order preserved. */
function unionCsv(values: readonly string[]): string {
  const seen = new Set<string>();
  for (const value of values) {
    for (const part of value.split(",")) {
      const label = part.trim();
      if (label) seen.add(label);
    }
  }
  return [...seen].join(", ");
}

function collapse(turns: readonly TraceRow[]): TraceRow {
  const ordered = [...turns].sort(compareTurnOrder);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const maxTurnIndex = ordered.reduce<number | null>(
    (max, t) =>
      t.turnIndex != null && (max === null || t.turnIndex > max)
        ? t.turnIndex
        : max,
    null
  );

  return {
    traceId: first.traceId,
    timestamp: first.timestamp,
    date: first.date,
    environment: firstWhere(ordered, (t) => t.environment),
    sessionId: first.sessionId,
    userId: firstWhere(ordered, (t) => t.userId) ?? "",
    latencySeconds: sumOrNull(ordered.map((t) => t.latencySeconds)),
    totalCost: sumOrNull(ordered.map((t) => t.totalCost)),
    outcome: last.outcome,
    prompt: firstWhere(ordered, (t) => t.prompt) ?? "",
    aoiName: lastWhere(ordered, (t) => t.aoiName) ?? "",
    aoiType: lastWhere(ordered, (t) => t.aoiType) ?? "",
    datasetsAnalysed: lastWhere(ordered, (t) => t.datasetsAnalysed) ?? "",
    toolCallCount: ordered.reduce((a, t) => a + t.toolCallCount, 0),
    turnTokens: ordered.reduce(
      (a, t) => a + (t.turnTokens > 0 ? t.turnTokens : 0),
      0
    ),
    hasInternalError: ordered.some((t) => t.hasInternalError),
    primaryDatasetName: lastWhere(ordered, (t) => t.primaryDatasetName),
    hasInsight: lastWhere(ordered, (t) => t.hasInsight),
    isGlobal: lastWhere(ordered, (t) => t.isGlobal),
    language: firstWhere(ordered, (t) => t.language),
    turnIndex: maxTurnIndex ?? ordered.length,
    insightCreatedThisTurn: ordered.some((t) => t.insightCreatedThisTurn)
      ? true
      : ordered.every((t) => t.insightCreatedThisTurn === null)
        ? null
        : false,
    datasetsAnalysedThisTurn: unionCsv(
      ordered.map((t) => t.datasetsAnalysedThisTurn)
    ),
  };
}

/**
 * One synthetic row per conversation, newest first (mirrors the API list
 * order). Pure: input rows are never mutated.
 */
export function aggregateConversations(rows: readonly TraceRow[]): TraceRow[] {
  const groups = new Map<string, TraceRow[]>();
  for (const row of rows) {
    const sessionId = String(row.sessionId ?? "").trim();
    const key = sessionId || `singleton:${row.traceId}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  return [...groups.values()]
    .map(collapse)
    .sort((a, b) =>
      String(b.timestamp ?? "").localeCompare(String(a.timestamp ?? ""))
    );
}
