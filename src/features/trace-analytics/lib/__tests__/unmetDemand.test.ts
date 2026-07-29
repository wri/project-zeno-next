import { describe, expect, it } from "vitest";
import { computeUnmetDemand } from "../analytics/unmetDemand";
import { makeRow } from "./helpers";

describe("computeUnmetDemand", () => {
  it("groups unserved prompts by normalized text with user counts", () => {
    const rows = [
      makeRow({
        outcome: "DEFER",
        prompt: "Show me soil carbon.",
        userId: "u1",
      }),
      makeRow({
        traceId: "t2",
        outcome: "DEFER",
        prompt: "show me soil carbon",
        userId: "u2",
      }),
      makeRow({
        traceId: "t3",
        outcome: "ERROR",
        prompt: "Show me soil carbon.",
        userId: "u1",
      }),
      makeRow({ traceId: "t4", outcome: "ANSWER", prompt: "forest loss" }),
    ];

    const demand = computeUnmetDemand(rows);
    expect(demand.topPrompts).toHaveLength(1);
    const top = demand.topPrompts[0];
    expect(top.count).toBe(3);
    expect(top.userCount).toBe(2);
    expect(top.prompt).toBe("Show me soil carbon.");
    expect(top.topOutcome).toBe("DEFER");
    expect(top.outcomes).toEqual({ DEFER: 2, ERROR: 1 });
  });

  it("computes unserved and defer shares over rows with a known outcome", () => {
    const rows = [
      makeRow({ outcome: "ANSWER" }),
      makeRow({ traceId: "t2", outcome: "DEFER" }),
      makeRow({ traceId: "t3", outcome: "ERROR" }),
      makeRow({ traceId: "t4", outcome: null }),
    ];
    const demand = computeUnmetDemand(rows);
    expect(demand.unservedShare).toBeCloseTo(2 / 3);
    expect(demand.deferShare).toBeCloseTo(1 / 3);
  });

  it("detects immediate same-prompt retries within a session", () => {
    const rows = [
      makeRow({
        traceId: "t1",
        sessionId: "s1",
        prompt: "Forest loss in Kenya",
        timestamp: "2026-06-01T10:00:00.000Z",
      }),
      makeRow({
        traceId: "t2",
        sessionId: "s1",
        prompt: "forest loss in Kenya.",
        timestamp: "2026-06-01T10:01:00.000Z",
      }),
      makeRow({
        traceId: "t3",
        sessionId: "s1",
        prompt: "Something else",
        timestamp: "2026-06-01T10:02:00.000Z",
      }),
      makeRow({
        traceId: "t4",
        sessionId: "s2",
        prompt: "Forest loss in Kenya",
        timestamp: "2026-06-01T11:00:00.000Z",
      }),
    ];
    const demand = computeUnmetDemand(rows);
    // One retry (t2 repeats t1 within s1) out of 4 prompts.
    expect(demand.retryShare).toBeCloseTo(1 / 4);
  });

  it("caps the list at the requested top-N ordered by count", () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow({
        traceId: `a${i}`,
        outcome: "DEFER",
        prompt: `unsupported thing ${i}`,
      })
    ).concat([
      makeRow({ traceId: "b1", outcome: "DEFER", prompt: "popular ask" }),
      makeRow({ traceId: "b2", outcome: "DEFER", prompt: "popular ask" }),
    ]);
    const demand = computeUnmetDemand(rows, { top: 3 });
    expect(demand.topPrompts).toHaveLength(3);
    expect(demand.topPrompts[0].prompt).toBe("popular ask");
    expect(demand.topPrompts[0].count).toBe(2);
  });

  it("handles an empty window", () => {
    const demand = computeUnmetDemand([]);
    expect(demand.unservedShare).toBe(0);
    expect(demand.retryShare).toBe(0);
    expect(demand.topPrompts).toEqual([]);
  });
});
