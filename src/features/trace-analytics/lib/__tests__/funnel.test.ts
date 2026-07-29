import { describe, expect, it } from "vitest";
import { computeJourneyFunnel } from "../analytics/funnel";
import { makeRow } from "./helpers";

describe("computeJourneyFunnel", () => {
  it("computes cumulative session-level stages", () => {
    const rows = [
      // s1: full journey — AOI, dataset, insight.
      makeRow({ sessionId: "s1", aoiName: "Brazil", hasInsight: false }),
      makeRow({
        traceId: "t2",
        sessionId: "s1",
        aoiName: "Brazil",
        hasInsight: true,
      }),
      // s2: AOI but no dataset (cumulative gate stops there).
      makeRow({
        traceId: "t3",
        sessionId: "s2",
        aoiName: "Kenya",
        datasetsAnalysed: "",
        hasInsight: false,
      }),
      // s3: nothing resolved at all.
      makeRow({
        traceId: "t4",
        sessionId: "s3",
        aoiName: "",
        datasetsAnalysed: "",
        hasInsight: false,
      }),
    ];

    const funnel = computeJourneyFunnel(rows);
    expect(funnel.totalSessions).toBe(3);
    const counts = funnel.stages.map((s) => s.count);
    expect(counts).toEqual([3, 2, 1, 1]);
    expect(funnel.stages[0].conversionFromPrev).toBe(1);
    expect(funnel.stages[1].conversionFromPrev).toBeCloseTo(2 / 3);
    expect(funnel.stages[2].conversionFromPrev).toBeCloseTo(1 / 2);
    expect(funnel.stages[3].conversionFromPrev).toBe(1);
    expect(funnel.insightKnown).toBe(true);
  });

  it("counts a global-AOI turn as area-selected", () => {
    const rows = [makeRow({ sessionId: "s1", aoiName: "", isGlobal: true })];
    const funnel = computeJourneyFunnel(rows);
    expect(funnel.stages[1].count).toBe(1);
  });

  it("treats rows without a session id as their own pseudo-session", () => {
    const rows = [
      makeRow({ traceId: "a", sessionId: null }),
      makeRow({ traceId: "b", sessionId: "" }),
    ];
    expect(computeJourneyFunnel(rows).totalSessions).toBe(2);
  });

  it("flags insight stage as unknown when hasInsight is never reported", () => {
    const rows = [
      makeRow({ hasInsight: null }),
      makeRow({ traceId: "t2", sessionId: "s2", hasInsight: null }),
    ];
    const funnel = computeJourneyFunnel(rows);
    expect(funnel.insightKnown).toBe(false);
  });

  it("handles an empty window", () => {
    const funnel = computeJourneyFunnel([]);
    expect(funnel.totalSessions).toBe(0);
    expect(funnel.stages.every((s) => s.count === 0)).toBe(true);
  });

  it("reports which sessions dropped before each stage", () => {
    const rows = [
      // s1: full journey.
      makeRow({ sessionId: "s1", aoiName: "Brazil", hasInsight: true }),
      // s2: AOI but no dataset → dropped before "dataset".
      makeRow({
        traceId: "t3",
        sessionId: "s2",
        aoiName: "Kenya",
        datasetsAnalysed: "",
        hasInsight: false,
      }),
      // s3: nothing at all → dropped before "aoi".
      makeRow({
        traceId: "t4",
        sessionId: "s3",
        aoiName: "",
        datasetsAnalysed: "",
        hasInsight: false,
      }),
      // s4: AOI + dataset but no insight → dropped before "insight".
      makeRow({
        traceId: "t5",
        sessionId: "s4",
        aoiName: "Peru",
        hasInsight: false,
      }),
    ];

    const funnel = computeJourneyFunnel(rows);
    expect(funnel.droppedBefore.aoi).toEqual(["s3"]);
    expect(funnel.droppedBefore.dataset).toEqual(["s2"]);
    expect(funnel.droppedBefore.insight).toEqual(["s4"]);
  });
});
