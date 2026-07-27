import type { TraceRow } from "../../model/types";

/** Build a TraceRow with sensible defaults for tests. */
export function makeRow(overrides: Partial<TraceRow> = {}): TraceRow {
  return {
    traceId: "t1",
    timestamp: "2026-06-01T10:00:00.000Z",
    date: "2026-06-01",
    environment: "production",
    sessionId: "s1",
    userId: "u1",
    latencySeconds: 1.5,
    totalCost: 0.01,
    outcome: "ANSWER",
    prompt: "How much forest was lost?",
    aoiName: "Brazil",
    aoiType: "country",
    datasetsAnalysed: "Tree cover loss",
    toolCallCount: 2,
    turnTokens: 100,
    hasInternalError: false,
    primaryDatasetName: null,
    hasInsight: null,
    isGlobal: null,
    language: null,
    turnIndex: null,
    insightCreatedThisTurn: null,
    datasetsAnalysedThisTurn: "",
    ...overrides,
  };
}
