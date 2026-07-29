import { describe, expect, it } from "vitest";
import {
  computeErrorOverlap,
  computePromptUtilisation,
  computeStarterPromptMix,
  computeSummaryStats,
  countAoiNames,
  countCategories,
} from "../analytics/aggregations";
import { computeDailyMetrics } from "../analytics/daily";
import { makeRow } from "./helpers";

describe("computeSummaryStats", () => {
  it("computes volume and outcome rates", () => {
    const rows = [
      makeRow({
        traceId: "a",
        outcome: "ANSWER",
        userId: "u1",
        sessionId: "s1",
      }),
      makeRow({
        traceId: "b",
        outcome: "ERROR",
        userId: "u2",
        sessionId: "s2",
      }),
      makeRow({
        traceId: "c",
        outcome: "ANSWER",
        userId: "u1",
        sessionId: "s1",
      }),
      makeRow({ traceId: "d", outcome: "DEFER", userId: "", sessionId: null }),
    ];
    const stats = computeSummaryStats(rows);
    expect(stats.totalTraces).toBe(4);
    expect(stats.uniqueUsers).toBe(2);
    expect(stats.uniqueThreads).toBe(2);
    expect(stats.successRate).toBeCloseTo(0.5);
    expect(stats.errorRate).toBeCloseTo(0.25);
    expect(stats.deferRate).toBeCloseTo(0.25);
  });

  it("ignores null costs and latencies", () => {
    const rows = [
      makeRow({ traceId: "a", totalCost: 0.02, latencySeconds: 2 }),
      makeRow({ traceId: "b", totalCost: null, latencySeconds: null }),
    ];
    const stats = computeSummaryStats(rows);
    expect(stats.costCount).toBe(1);
    expect(stats.meanCost).toBeCloseTo(0.02);
    expect(stats.latencyCount).toBe(1);
    expect(stats.meanLatency).toBe(2);
  });
});

describe("computeDailyMetrics", () => {
  it("groups by date and sorts ascending", () => {
    const rows = [
      makeRow({ traceId: "a", date: "2026-06-02", outcome: "ANSWER" }),
      makeRow({ traceId: "b", date: "2026-06-01", outcome: "ERROR" }),
      makeRow({ traceId: "c", date: "2026-06-01", outcome: "ANSWER" }),
      makeRow({ traceId: "d", date: null }),
    ];
    const daily = computeDailyMetrics(rows);
    expect(daily.map((d) => d.date)).toEqual(["2026-06-01", "2026-06-02"]);
    expect(daily[0].traces).toBe(2);
    expect(daily[0].successRate).toBeCloseTo(0.5);
    expect(daily[0].errorRate).toBeCloseTo(0.5);
  });
});

describe("computePromptUtilisation", () => {
  it("counts prompts per user per day", () => {
    const rows = [
      makeRow({ traceId: "a", userId: "u1", date: "2026-06-01" }),
      makeRow({ traceId: "b", userId: "u1", date: "2026-06-01" }),
      makeRow({ traceId: "c", userId: "u2", date: "2026-06-01" }),
      makeRow({ traceId: "d", userId: "u1", date: "2026-06-02" }),
    ];
    const util = computePromptUtilisation(rows);
    expect(util.userDays).toBe(3); // (u1, 06-01), (u2, 06-01), (u1, 06-02)
    expect(util.meanPrompts).toBeCloseTo(4 / 3);
    expect(util.daily).toHaveLength(2);
  });
});

describe("countCategories", () => {
  it("explodes comma-separated values when asked", () => {
    const counts = countCategories(["a, b", "b", "", null], {
      explodeCsv: true,
    });
    expect(counts).toEqual([
      { label: "b", count: 2 },
      { label: "a", count: 1 },
    ]);
  });
});

describe("countAoiNames", () => {
  it("attaches the dominant AOI type", () => {
    const rows = [
      makeRow({ traceId: "a", aoiName: "Brazil", aoiType: "country" }),
      makeRow({ traceId: "b", aoiName: "Brazil", aoiType: "country" }),
      makeRow({ traceId: "c", aoiName: "Brazil", aoiType: "polygon" }),
      makeRow({ traceId: "d", aoiName: "", aoiType: "country" }),
    ];
    expect(countAoiNames(rows)).toEqual([
      { label: "Brazil", count: 3, aoiType: "country" },
    ]);
  });
});

describe("computeStarterPromptMix", () => {
  it("matches prompts after normalization", () => {
    const rows = [
      makeRow({
        traceId: "a",
        prompt: "Show   changes in grassland extent in Montana.",
      }),
      makeRow({ traceId: "b", prompt: "something else" }),
    ];
    const mix = computeStarterPromptMix(
      rows,
      ["Show changes in grassland extent in Montana."],
      { "Show changes in grassland extent in Montana.": "Grassland change" }
    );
    expect(mix.starterCount).toBe(1);
    expect(mix.otherCount).toBe(1);
    expect(mix.breakdown).toEqual([{ label: "Grassland change", count: 1 }]);
  });
});

describe("computeErrorOverlap", () => {
  it("computes overlap categories that sum to the total", () => {
    const rows = [
      makeRow({ traceId: "a", hasInternalError: true, outcome: "ANSWER" }),
      makeRow({ traceId: "b", hasInternalError: true, outcome: "ERROR" }),
      makeRow({ traceId: "c", hasInternalError: false, outcome: "SOFT_ERROR" }),
      makeRow({ traceId: "d", hasInternalError: false, outcome: "ANSWER" }),
    ];
    const overlap = computeErrorOverlap(rows);
    expect(overlap.internalErrors).toBe(2);
    expect(overlap.userVisibleErrors).toBe(2);
    expect(overlap.both).toBe(1);
    expect(overlap.recovered).toBe(1);
    expect(
      overlap.noErrors +
        overlap.internalOnly +
        overlap.userVisibleOnly +
        overlap.both
    ).toBe(overlap.total);
  });
});
