import { describe, expect, it } from "vitest";
import { aggregateConversations } from "../analytics/conversationGrain";
import { compareTurnOrder, isEarlierTurn } from "../analytics/turnOrder";
import { makeRow } from "./helpers";

describe("turn ordering", () => {
  it("prefers the server turnIndex over timestamps", () => {
    // Timestamps disagree with the true order (e.g. clock skew) — turnIndex wins.
    const first = makeRow({
      traceId: "a",
      turnIndex: 1,
      timestamp: "2026-06-01T12:00:00.000Z",
    });
    const second = makeRow({
      traceId: "b",
      turnIndex: 2,
      timestamp: "2026-06-01T11:00:00.000Z",
    });
    expect(compareTurnOrder(first, second)).toBeLessThan(0);
    expect(isEarlierTurn(first, second)).toBe(true);
    expect(isEarlierTurn(second, first)).toBe(false);
  });

  it("falls back to timestamps when turnIndex is missing", () => {
    const early = makeRow({ timestamp: "2026-06-01T10:00:00.000Z" });
    const late = makeRow({ timestamp: "2026-06-01T11:00:00.000Z" });
    expect(compareTurnOrder(early, late)).toBeLessThan(0);
    expect(isEarlierTurn(early, late)).toBe(true);
  });
});

describe("aggregateConversations", () => {
  const turns = [
    makeRow({
      traceId: "t1",
      sessionId: "s1",
      turnIndex: 1,
      timestamp: "2026-06-01T10:00:00.000Z",
      date: "2026-06-01",
      prompt: "Opening ask",
      outcome: "DEFER",
      latencySeconds: 2,
      totalCost: 0.01,
      toolCallCount: 0,
      turnTokens: 100,
      datasetsAnalysed: "",
      datasetsAnalysedThisTurn: "",
      language: "en",
    }),
    makeRow({
      traceId: "t2",
      sessionId: "s1",
      turnIndex: 2,
      timestamp: "2026-06-01T10:05:00.000Z",
      date: "2026-06-01",
      prompt: "Follow-up",
      outcome: "ANSWER",
      latencySeconds: 3,
      totalCost: 0.02,
      toolCallCount: 4,
      turnTokens: 0, // unknown — must not count as zero tokens
      hasInternalError: true,
      datasetsAnalysed: "Tree cover loss, Fires",
      datasetsAnalysedThisTurn: "Tree cover loss, Fires",
      hasInsight: true,
      insightCreatedThisTurn: true,
      aoiName: "Brazil",
      aoiType: "country",
    }),
  ];

  it("collapses a session into one row with documented semantics", () => {
    const [convo] = aggregateConversations(turns);
    // Identity/prompt/date from the first turn.
    expect(convo.traceId).toBe("t1");
    expect(convo.prompt).toBe("Opening ask");
    expect(convo.date).toBe("2026-06-01");
    // Outcome from the last turn.
    expect(convo.outcome).toBe("ANSWER");
    // Sums across turns; turnTokens === 0 means unknown and is skipped.
    expect(convo.latencySeconds).toBe(5);
    expect(convo.totalCost).toBeCloseTo(0.03);
    expect(convo.toolCallCount).toBe(4);
    expect(convo.turnTokens).toBe(100);
    expect(convo.hasInternalError).toBe(true);
    // Thread-cumulative fields from the latest turn carrying a value.
    expect(convo.datasetsAnalysed).toBe("Tree cover loss, Fires");
    expect(convo.hasInsight).toBe(true);
    expect(convo.aoiName).toBe("Brazil");
    // Depth and per-turn deltas.
    expect(convo.turnIndex).toBe(2);
    expect(convo.insightCreatedThisTurn).toBe(true);
    expect(convo.datasetsAnalysedThisTurn).toBe("Tree cover loss, Fires");
    expect(convo.language).toBe("en");
  });

  it("orders turns by turnIndex even when timestamps disagree", () => {
    const swapped = [
      makeRow({
        traceId: "late-but-first",
        sessionId: "s1",
        turnIndex: 1,
        timestamp: "2026-06-01T12:00:00.000Z",
        prompt: "Real opener",
        outcome: "DEFER",
      }),
      makeRow({
        traceId: "early-but-second",
        sessionId: "s1",
        turnIndex: 2,
        timestamp: "2026-06-01T11:00:00.000Z",
        prompt: "Real closer",
        outcome: "ANSWER",
      }),
    ];
    const [convo] = aggregateConversations(swapped);
    expect(convo.prompt).toBe("Real opener");
    expect(convo.outcome).toBe("ANSWER");
  });

  it("keeps session-less rows as singleton conversations", () => {
    const singletons = aggregateConversations([
      makeRow({ traceId: "x1", sessionId: null }),
      makeRow({ traceId: "x2", sessionId: null }),
    ]);
    expect(singletons).toHaveLength(2);
    expect(singletons.map((r) => r.turnIndex)).toEqual([1, 1]);
  });

  it("groups multiple sessions and sorts newest conversation first", () => {
    const rows = [
      ...turns,
      makeRow({
        traceId: "u1",
        sessionId: "s2",
        turnIndex: 1,
        timestamp: "2026-06-02T09:00:00.000Z",
        date: "2026-06-02",
      }),
    ];
    const convos = aggregateConversations(rows);
    expect(convos).toHaveLength(2);
    expect(convos[0].sessionId).toBe("s2");
    expect(convos[1].sessionId).toBe("s1");
  });

  it("unions per-turn dataset deltas without duplicates", () => {
    const [convo] = aggregateConversations([
      makeRow({
        traceId: "d1",
        sessionId: "s1",
        turnIndex: 1,
        datasetsAnalysedThisTurn: "Fires",
      }),
      makeRow({
        traceId: "d2",
        sessionId: "s1",
        turnIndex: 2,
        datasetsAnalysedThisTurn: "Fires, Tree cover loss",
      }),
    ]);
    expect(convo.datasetsAnalysedThisTurn).toBe("Fires, Tree cover loss");
  });

  it("returns null aggregates when no turn carries a signal", () => {
    const [convo] = aggregateConversations([
      makeRow({
        traceId: "n1",
        sessionId: "s1",
        latencySeconds: null,
        totalCost: null,
        insightCreatedThisTurn: null,
      }),
    ]);
    expect(convo.latencySeconds).toBeNull();
    expect(convo.totalCost).toBeNull();
    expect(convo.insightCreatedThisTurn).toBeNull();
  });
});
