/**
 * Client-side refinement of the server's coarse outcome labels.
 *
 * The Zeno API's outcome enum (ANSWER/DEFER/SOFT_ERROR/ERROR/EMPTY) is
 * re-derivable from stored primitives, and the list payload carries enough of
 * them to split the two biggest conflations locally:
 *   - ANSWER hides turns that recovered from internal tool errors;
 *   - DEFER lumps genuine clarifications with answers served from earlier
 *     turns' results (no new tool call needed).
 * This layer is a derived *view* — `row.outcome` is never mutated — and is
 * designed to be superseded by the server's `outcome_detail` once
 * parser_version ≥ 2 ships (see docs/outcome-taxonomy-plan.md).
 */

import type { TraceRow } from "../../model/types";
import { normalizePrompt } from "../format";
import { TIMEOUT_SUSPECT_SECONDS } from "../../model/config";

export type RefinedOutcome =
  | "ANSWER_CLEAN"
  | "ANSWER_DEGRADED"
  | "CONTEXT_ANSWER"
  | "DEFER_OTHER"
  | "SOFT_ERROR"
  | "ERROR"
  | "EMPTY"
  | "NO_PROMPT";

export const REFINED_LABELS: Readonly<Record<RefinedOutcome, string>> = {
  ANSWER_CLEAN: "Attempted answer",
  ANSWER_DEGRADED: "Answered (internal errors)",
  CONTEXT_ANSWER: "Answered from context",
  DEFER_OTHER: "Defer (clarify / other)",
  SOFT_ERROR: "Soft error",
  ERROR: "Empty answer",
  EMPTY: "No response",
  NO_PROMPT: "UI event (no prompt)",
};

/** Audit reclassifications: traceId → corrected refined outcome. */
export type OutcomeOverrides = ReadonlyMap<string, RefinedOutcome>;

export interface RefinedRow {
  readonly row: TraceRow;
  readonly refined: RefinedOutcome;
  /** Non-English no-tool answer: may be a refusal the English needles missed. */
  readonly lowConfidence: boolean;
  /** EMPTY at/above the gateway-timeout latency threshold. */
  readonly timeoutSuspect: boolean;
}

const FAILURE_OUTCOMES = new Set(["SOFT_ERROR", "ERROR", "EMPTY"]);

/** Earliest tool-using timestamp per session (for answered-from-context). */
function earliestToolTurnBySession(
  rows: readonly TraceRow[]
): Map<string, string> {
  const earliest = new Map<string, string>();
  for (const row of rows) {
    const sessionId = String(row.sessionId ?? "").trim();
    if (!sessionId || !row.timestamp || row.toolCallCount <= 0) continue;
    const current = earliest.get(sessionId);
    if (!current || row.timestamp < current) {
      earliest.set(sessionId, row.timestamp);
    }
  }
  return earliest;
}

/** Classify every row into the refined taxonomy (pure; rows untouched). */
export function refineOutcomes(
  rows: readonly TraceRow[],
  overrides?: OutcomeOverrides
): RefinedRow[] {
  const toolStartBySession = earliestToolTurnBySession(rows);

  return rows.map((row) => {
    const refined =
      overrides?.get(row.traceId) ?? classify(row, toolStartBySession);
    return {
      row,
      refined,
      lowConfidence:
        refined === "DEFER_OTHER" &&
        Boolean(row.language) &&
        row.language !== "en",
      timeoutSuspect:
        refined === "EMPTY" &&
        typeof row.latencySeconds === "number" &&
        row.latencySeconds >= TIMEOUT_SUSPECT_SECONDS,
    };
  });
}

function classify(
  row: TraceRow,
  toolStartBySession: Map<string, string>
): RefinedOutcome {
  if (!row.prompt.trim()) return "NO_PROMPT";

  switch (row.outcome) {
    case "ANSWER":
      return row.hasInternalError ? "ANSWER_DEGRADED" : "ANSWER_CLEAN";
    case "DEFER": {
      // datasetsAnalysed is thread-cumulative: non-empty on a no-tool turn
      // means earlier turns in this conversation produced analysis results.
      if (row.datasetsAnalysed.trim()) return "CONTEXT_ANSWER";
      const sessionId = String(row.sessionId ?? "").trim();
      const toolStart = sessionId
        ? toolStartBySession.get(sessionId)
        : undefined;
      if (toolStart && row.timestamp && row.timestamp > toolStart) {
        return "CONTEXT_ANSWER";
      }
      return "DEFER_OTHER";
    }
    case "SOFT_ERROR":
      return "SOFT_ERROR";
    case "ERROR":
      return "ERROR";
    default:
      // EMPTY, null and unknown codes: nothing usable reached the user.
      return "EMPTY";
  }
}

// --------------------------------------------------------------------------- //
// Failure follow-ups (what the user did next)
// --------------------------------------------------------------------------- //

export interface FailureFollowUps {
  readonly failures: number;
  /** Failure where the user's next prompt in the session is the same prompt. */
  readonly retriedSamePrompt: number;
  /** Failure with no later turn in the session (within the window). */
  readonly endedSession: number;
}

export function computeFailureFollowUps(
  rows: readonly TraceRow[]
): FailureFollowUps {
  const bySession = new Map<string, TraceRow[]>();
  for (const row of rows) {
    const sessionId = String(row.sessionId ?? "").trim();
    if (!sessionId || !row.timestamp) continue;
    const bucket = bySession.get(sessionId) ?? [];
    bucket.push(row);
    bySession.set(sessionId, bucket);
  }

  let failures = 0;
  let retriedSamePrompt = 0;
  let endedSession = 0;
  for (const bucket of bySession.values()) {
    const ordered = [...bucket].sort((a, b) =>
      String(a.timestamp).localeCompare(String(b.timestamp))
    );
    ordered.forEach((row, i) => {
      if (!FAILURE_OUTCOMES.has(String(row.outcome))) return;
      failures += 1;
      const next = ordered[i + 1];
      if (!next) {
        endedSession += 1;
        return;
      }
      const prompt = normalizePrompt(row.prompt);
      if (prompt && normalizePrompt(next.prompt) === prompt) {
        retriedSamePrompt += 1;
      }
    });
  }
  return { failures, retriedSamePrompt, endedSession };
}

// --------------------------------------------------------------------------- //
// Outcome flow (Sankey source data)
// --------------------------------------------------------------------------- //

export type FlowMode = "api" | "refined";

export interface FlowTerminal {
  readonly key: string;
  readonly count: number;
  /** Share of ALL queries in the window. */
  readonly share: number;
  /** Percentage-point change vs the previous window, if computable. */
  readonly deltaPp: number | null;
  /** Extra context rendered under the terminal label. */
  readonly annotation: string | null;
}

export interface OutcomeFlow {
  readonly total: number;
  readonly responded: number;
  readonly respondedShare: number;
  readonly respondedDeltaPp: number | null;
  /** Terminals fed straight from the source (hard errors, UI events). */
  readonly sourceDirect: readonly FlowTerminal[];
  /** Terminals fed from the "user sees a response" junction. */
  readonly viaResponse: readonly FlowTerminal[];
}

function countByTerminal(
  rows: readonly TraceRow[],
  mode: FlowMode,
  overrides?: OutcomeOverrides
): {
  direct: Map<string, number>;
  via: Map<string, number>;
  annotations: Map<string, string>;
} {
  const direct = new Map<string, number>();
  const via = new Map<string, number>();
  const annotations = new Map<string, string>();
  const add = (map: Map<string, number>, key: string) =>
    map.set(key, (map.get(key) ?? 0) + 1);

  if (mode === "api") {
    for (const row of rows) {
      const outcome = String(row.outcome);
      if (outcome === "ERROR" || outcome === "EMPTY" || row.outcome == null) {
        add(direct, "HARD_ERROR");
      } else if (outcome === "SOFT_ERROR" || outcome === "DEFER") {
        add(via, outcome);
      } else {
        add(via, "ANSWER");
      }
    }
    return { direct, via, annotations };
  }

  const refined = refineOutcomes(rows, overrides);
  let emptyCount = 0;
  let errorCount = 0;
  let timeoutSuspects = 0;
  let lowConfidence = 0;
  for (const { refined: label, ...flags } of refined) {
    if (label === "ERROR" || label === "EMPTY") {
      add(direct, "HARD_ERROR");
      if (label === "EMPTY") emptyCount += 1;
      else errorCount += 1;
      if (flags.timeoutSuspect) timeoutSuspects += 1;
    } else if (label === "NO_PROMPT") {
      add(direct, "NO_PROMPT");
    } else {
      add(via, label);
      if (flags.lowConfidence) lowConfidence += 1;
    }
  }
  if (direct.get("HARD_ERROR")) {
    const parts = [
      errorCount ? `${errorCount} empty` : "",
      emptyCount ? `${emptyCount} no response` : "",
      timeoutSuspects ? `${timeoutSuspects} timeout?` : "",
    ].filter(Boolean);
    annotations.set("HARD_ERROR", parts.join(" · "));
  }
  if (lowConfidence) {
    annotations.set("DEFER_OTHER", `${lowConfidence} non-English, unverified`);
  }
  return { direct, via, annotations };
}

/** Terminal display order (top → bottom of the diagram). */
const DIRECT_ORDER = ["HARD_ERROR", "NO_PROMPT"] as const;
const VIA_ORDER_API = ["SOFT_ERROR", "DEFER", "ANSWER"] as const;
const VIA_ORDER_REFINED = [
  "SOFT_ERROR",
  "DEFER_OTHER",
  "CONTEXT_ANSWER",
  "ANSWER_DEGRADED",
  "ANSWER_CLEAN",
] as const;

export function computeOutcomeFlow(
  rows: readonly TraceRow[],
  prevRows: readonly TraceRow[] | null,
  mode: FlowMode,
  overrides?: OutcomeOverrides
): OutcomeFlow {
  const total = rows.length;
  const current = countByTerminal(rows, mode, overrides);
  const prev =
    prevRows && prevRows.length ? countByTerminal(prevRows, mode) : null;
  const prevTotal = prevRows?.length ?? 0;

  const toTerminal = (
    key: string,
    count: number,
    prevCount: number | undefined
  ): FlowTerminal => ({
    key,
    count,
    share: total ? count / total : 0,
    deltaPp:
      prev && prevTotal
        ? (count / Math.max(1, total) - (prevCount ?? 0) / prevTotal) * 100
        : null,
    annotation: current.annotations.get(key) ?? null,
  });

  const viaOrder = mode === "api" ? VIA_ORDER_API : VIA_ORDER_REFINED;
  const sourceDirect = DIRECT_ORDER.filter((k) => current.direct.get(k)).map(
    (k) => toTerminal(k, current.direct.get(k) ?? 0, prev?.direct.get(k))
  );
  const viaResponse = viaOrder
    .filter((k) => current.via.get(k))
    .map((k) => toTerminal(k, current.via.get(k) ?? 0, prev?.via.get(k)));

  const responded = viaResponse.reduce((acc, t) => acc + t.count, 0);
  const prevResponded = prev
    ? [...prev.via.values()].reduce((a, b) => a + b, 0)
    : 0;

  return {
    total,
    responded,
    respondedShare: total ? responded / total : 0,
    respondedDeltaPp:
      prev && prevTotal
        ? (responded / Math.max(1, total) - prevResponded / prevTotal) * 100
        : null,
    sourceDirect,
    viaResponse,
  };
}
