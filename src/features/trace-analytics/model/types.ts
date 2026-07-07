/** Shared domain types for the GNW trace analytics app. */

/** Outcome classification assigned server-side by the Zeno API. */
export type TraceOutcome =
  | "ANSWER"
  | "DEFER"
  | "SOFT_ERROR"
  | "ERROR"
  | "EMPTY";

export const TRACE_OUTCOMES: readonly TraceOutcome[] = [
  "ANSWER",
  "DEFER",
  "SOFT_ERROR",
  "ERROR",
  "EMPTY",
];

/**
 * One trace row as consumed by the analytics pipeline. Mapped from a Zeno
 * `TraceListItem` (see lib/api/zeno.ts). Numbers are server-side *per-turn*
 * metrics.
 */
export interface TraceRow {
  readonly traceId: string;
  /** ISO timestamp of the trace, or null when unparseable. */
  readonly timestamp: string | null;
  /** UTC calendar date (YYYY-MM-DD) derived from the timestamp. */
  readonly date: string | null;
  readonly environment: string | null;
  readonly sessionId: string | null;
  readonly userId: string;
  readonly latencySeconds: number | null;
  readonly totalCost: number | null;
  readonly outcome: string | null;
  readonly prompt: string;
  readonly aoiName: string;
  readonly aoiType: string;
  /** Comma-joined dataset names analysed in the turn. */
  readonly datasetsAnalysed: string;
  readonly toolCallCount: number;
  readonly turnTokens: number;
  readonly hasInternalError: boolean;
  readonly primaryDatasetName: string | null;
  readonly hasInsight: boolean | null;
  readonly isGlobal: boolean | null;
  /** ISO 639-1 code of the detected prompt language (langid, server-side). */
  readonly language: string | null;
}

/** One conversation thread (deduped server-side by the Zeno API). */
export interface SessionRow {
  readonly sessionId: string;
  readonly userId: string;
  readonly environment: string | null;
  readonly firstPrompt: string;
  readonly firstTimestamp: string | null;
  readonly lastTimestamp: string | null;
  readonly turnCount: number;
}

/** Minimal picker item for the Trace Explorer list. */
export interface TraceListEntry {
  readonly id: string;
  readonly prompt: string;
  readonly traceTimestamp: string | null;
  readonly sessionId: string | null;
}

/** Loose message shape from the AgentState snapshot (input/output.messages). */
export interface AgentMessage {
  readonly [key: string]: unknown;
}

/** Full trace detail from GET /api/traces/{id} (raw comes live from Langfuse). */
export interface TraceDetail {
  readonly id: string;
  readonly sessionId: string | null;
  readonly environment: string | null;
  readonly traceTimestamp: string | null;
  readonly latencySeconds: number | null;
  readonly totalCost: number | null;
  readonly prompt: string;
  /** Final extracted answer text (parsed server-side, present without raw). */
  readonly answer: string | null;
  readonly rawAvailable: boolean;
  readonly input: { readonly messages: readonly AgentMessage[] } | null;
  readonly output: { readonly messages: readonly AgentMessage[] } | null;
  /** The unmodified API payload, for raw JSON view / download. */
  readonly raw: Record<string, unknown>;
}

/** GNW user (camelCase payload from /api/auth/me and /api/admin/users). */
export interface GnwUser {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
  readonly userType: string;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}
