import { describe, expect, it } from "vitest";
import {
  computeFailureFollowUps,
  computeOutcomeFlow,
  refineOutcomes,
} from "../analytics/outcomeRefine";
import { makeRow } from "./helpers";

describe("refineOutcomes", () => {
  it("splits ANSWER by internal-error recovery", () => {
    const rows = [
      makeRow({ traceId: "a", outcome: "ANSWER", hasInternalError: false }),
      makeRow({ traceId: "b", outcome: "ANSWER", hasInternalError: true }),
    ];
    const refined = refineOutcomes(rows);
    expect(refined[0].refined).toBe("ANSWER_CLEAN");
    expect(refined[1].refined).toBe("ANSWER_DEGRADED");
  });

  it("rescues DEFER with cumulative analysis context", () => {
    const row = makeRow({
      outcome: "DEFER",
      toolCallCount: 0,
      datasetsAnalysed: "Tree cover loss",
    });
    expect(refineOutcomes([row])[0].refined).toBe("CONTEXT_ANSWER");
  });

  it("rescues DEFER when an earlier turn in the session used tools", () => {
    const rows = [
      makeRow({
        traceId: "t1",
        sessionId: "s1",
        timestamp: "2026-06-01T10:00:00.000Z",
        outcome: "ANSWER",
        toolCallCount: 3,
      }),
      makeRow({
        traceId: "t2",
        sessionId: "s1",
        timestamp: "2026-06-01T10:05:00.000Z",
        outcome: "DEFER",
        toolCallCount: 0,
        datasetsAnalysed: "",
      }),
    ];
    const refined = refineOutcomes(rows);
    expect(refined[1].refined).toBe("CONTEXT_ANSWER");
  });

  it("keeps first-turn DEFER without context as DEFER_OTHER, flagging non-English", () => {
    const row = makeRow({
      outcome: "DEFER",
      toolCallCount: 0,
      datasetsAnalysed: "",
      language: "es",
    });
    const [refined] = refineOutcomes([row]);
    expect(refined.refined).toBe("DEFER_OTHER");
    expect(refined.lowConfidence).toBe(true);
  });

  it("quarantines promptless traces and flags timeout suspects", () => {
    const noPrompt = makeRow({ prompt: "", outcome: "ANSWER" });
    const timeout = makeRow({
      outcome: "EMPTY",
      latencySeconds: 300,
      datasetsAnalysed: "",
    });
    const refined = refineOutcomes([noPrompt, timeout]);
    expect(refined[0].refined).toBe("NO_PROMPT");
    expect(refined[1].refined).toBe("EMPTY");
    expect(refined[1].timeoutSuspect).toBe(true);
  });

  it("applies audit overrides by trace id", () => {
    const row = makeRow({
      traceId: "x",
      outcome: "DEFER",
      toolCallCount: 0,
      datasetsAnalysed: "",
    });
    const refined = refineOutcomes([row], new Map([["x", "SOFT_ERROR"]]));
    expect(refined[0].refined).toBe("SOFT_ERROR");
  });
});

describe("computeFailureFollowUps", () => {
  it("counts retries and session-ending failures", () => {
    const rows = [
      makeRow({
        traceId: "f1",
        sessionId: "s1",
        timestamp: "2026-06-01T10:00:00.000Z",
        outcome: "ERROR",
        prompt: "show forest loss",
      }),
      makeRow({
        traceId: "f2",
        sessionId: "s1",
        timestamp: "2026-06-01T10:01:00.000Z",
        outcome: "ANSWER",
        prompt: "Show forest loss.",
      }),
      makeRow({
        traceId: "f3",
        sessionId: "s2",
        timestamp: "2026-06-01T11:00:00.000Z",
        outcome: "EMPTY",
      }),
    ];
    const followUps = computeFailureFollowUps(rows);
    expect(followUps.failures).toBe(2);
    expect(followUps.retriedSamePrompt).toBe(1); // normalized prompts match
    expect(followUps.endedSession).toBe(1);
  });
});

describe("computeOutcomeFlow", () => {
  const rows = [
    makeRow({ traceId: "1", outcome: "ANSWER", hasInternalError: false }),
    makeRow({ traceId: "2", outcome: "ANSWER", hasInternalError: true }),
    makeRow({
      traceId: "3",
      outcome: "DEFER",
      toolCallCount: 0,
      datasetsAnalysed: "Tree cover loss",
      sessionId: "s-defer-1",
    }),
    makeRow({
      traceId: "4",
      outcome: "DEFER",
      toolCallCount: 0,
      datasetsAnalysed: "",
      sessionId: "s-defer-2",
    }),
    makeRow({ traceId: "5", outcome: "SOFT_ERROR" }),
    makeRow({ traceId: "6", outcome: "ERROR" }),
    makeRow({ traceId: "7", outcome: "EMPTY", datasetsAnalysed: "" }),
    makeRow({ traceId: "8", outcome: "ANSWER", prompt: "" }),
  ];

  it("api mode mirrors the server labels with merged hard errors", () => {
    const flow = computeOutcomeFlow(rows, null, "api");
    expect(flow.total).toBe(8);
    expect(flow.sourceDirect).toEqual([
      expect.objectContaining({ key: "HARD_ERROR", count: 2 }),
    ]);
    const byKey = Object.fromEntries(
      flow.viaResponse.map((t) => [t.key, t.count])
    );
    expect(byKey).toEqual({ SOFT_ERROR: 1, DEFER: 2, ANSWER: 3 });
    expect(flow.responded).toBe(6);
    expect(flow.respondedDeltaPp).toBeNull();
  });

  it("refined mode splits answers, rescues context defers and quarantines UI events", () => {
    const flow = computeOutcomeFlow(rows, null, "refined");
    const byKey = Object.fromEntries(
      [...flow.sourceDirect, ...flow.viaResponse].map((t) => [t.key, t.count])
    );
    expect(byKey).toEqual({
      HARD_ERROR: 2,
      NO_PROMPT: 1,
      SOFT_ERROR: 1,
      DEFER_OTHER: 1,
      CONTEXT_ANSWER: 1,
      ANSWER_DEGRADED: 1,
      ANSWER_CLEAN: 1,
    });
  });

  it("computes percentage-point deltas against the previous window", () => {
    const prev = [
      makeRow({ traceId: "p1", outcome: "ANSWER" }),
      makeRow({ traceId: "p2", outcome: "ERROR" }),
    ];
    const flow = computeOutcomeFlow(rows, prev, "api");
    const hard = flow.sourceDirect.find((t) => t.key === "HARD_ERROR");
    // current 2/8 = 25%, previous 1/2 = 50% → −25pp
    expect(hard?.deltaPp).toBeCloseTo(-25, 6);
  });
});
