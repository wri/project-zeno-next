import { describe, expect, it } from "vitest";
import { failureBreakdown, failurePhrase } from "../failures";
import { formatDay, parseVersion, pct, share } from "../format";
import { mixSentence } from "../mix";
import { filterQuestions, NO_FILTER } from "../questions";
import { monthsSinceOrigin, pickRun, trendRuns } from "../runs";
import { tierLines, tiersOf } from "../tiers";
import type { BenchmarkRunRef } from "../../model/types";
import { makeQuestion, makeStats, makeUseCase } from "./fixtures";

describe("tiersOf", () => {
  it("splits the cumulative shares into four tiers that sum to the scored total", () => {
    const tiers = tiersOf(
      makeStats({
        scored: 269,
        everyTime: 135 / 269,
        majority: 170 / 269,
        anyTime: 191 / 269,
      })
    );
    expect(tiers.map((t) => [t.key, t.count])).toEqual([
      ["every", 135],
      ["most", 35],
      ["some", 21],
      ["never", 78],
    ]);
    expect(tiers.reduce((sum, t) => sum + t.count, 0)).toBe(269);
    expect(tiers[0].share).toBeCloseTo(135 / 269);
  });

  it("treats a group with no scored question as empty", () => {
    const tiers = tiersOf(
      makeStats({ scored: 0, everyTime: null, majority: null, anyTime: null })
    );
    expect(tiers.every((t) => t.count === 0 && t.share === null)).toBe(true);
  });

  it("words each tier once for labels and tooltips", () => {
    expect(tierLines(makeStats())[0]).toBe("40% accurate every time (4)");
  });
});

describe("failureBreakdown", () => {
  it("lists the non-empty stages in attribution order with their share", () => {
    const stats = makeStats({
      failureModes: {
        scope: 1,
        retrieval: 3,
        analysis: 0,
        explanation: 1,
        output: 0,
        unattributed: 1,
      },
    });
    expect(failureBreakdown(stats).map((m) => [m.key, m.count])).toEqual([
      ["scope", 1],
      ["retrieval", 3],
      ["explanation", 1],
      ["unattributed", 1],
    ]);
    expect(failureBreakdown(stats)[1].share).toBeCloseTo(0.3);
    expect(failurePhrase(stats)).toBe(
      "1 at scope, 3 at retrieval, 1 at explanation, 1 at unattributed"
    );
  });
});

describe("filterQuestions", () => {
  const pass = makeQuestion({ id: "a" });
  const flaky = makeQuestion({
    id: "b",
    status: "inconsistent",
    failedChecks: [
      {
        check: "aoi_id_match",
        stage: "retrieval",
        verdict: "pass",
        perTrial: [true, false, true],
        actual: null,
        reason: null,
      },
    ],
  });
  const failed = makeQuestion({
    id: "c",
    verdict: "fail",
    status: "fail",
    useCases: ["UC2"],
    type: "causal",
    query: "Why is Riau burning?",
  });
  const errored = makeQuestion({ id: "d", verdict: "error", status: "error" });
  const all = [pass, flaky, failed, errored];
  const ids = (f: Partial<typeof NO_FILTER>) =>
    filterQuestions(all, { ...NO_FILTER, ...f }).map((q) => q.id);

  it("filters by status, type, use case and searches the check labels", () => {
    expect(ids({ status: "failed" })).toEqual(["c", "d"]);
    expect(ids({ status: "inconsistent" })).toEqual(["b"]);
    expect(ids({ type: "causal" })).toEqual(["c"]);
    expect(ids({ useCase: "UC2" })).toEqual(["c"]);
    expect(ids({ search: "right place" })).toEqual(["b"]);
    expect(ids({ search: "RIAU" })).toEqual(["c"]);
  });
});

describe("mixSentence", () => {
  it("names the top types, the places over 15% and the top datasets, keeping acronyms", () => {
    expect(mixSentence(makeUseCase())).toBe(
      "Mostly monitoring and causal questions, about sub-national areas and protected areas, using GHG net flux and tree cover loss."
    );
  });
});

describe("runs", () => {
  const run = (
    runId: string,
    version: string,
    canonical: boolean
  ): BenchmarkRunRef => ({
    runId,
    started: `${runId.slice(0, 4)}-${runId.slice(4, 6)}-${runId.slice(6, 8)}T00:00:00Z`,
    version,
    versionLabel: version,
    canonical,
    pagePath: `results/benchmark/pages/${runId}.json`,
  });
  const runs = [
    run("20261001T144123Z_prod", "2026-draft-2", true),
    run("20261023T094447Z_prod", "2026-draft-3", true),
    run("20261024T090000Z_staging", "2026-draft-3", false),
  ];

  it("opens on the requested run, else the newest canonical one", () => {
    expect(pickRun(runs, "20261001T144123Z_prod")?.runId).toBe(
      "20261001T144123Z_prod"
    );
    expect(pickRun(runs, "missing")?.runId).toBe("20261023T094447Z_prod");
    expect(pickRun(runs, null)?.runId).toBe("20261023T094447Z_prod");
    expect(pickRun([], null)).toBeNull();
  });

  it("draws the trend from canonical runs of one version only", () => {
    expect(trendRuns(runs, "2026-draft-3").map((r) => r.runId)).toEqual([
      "20261023T094447Z_prod",
    ]);
  });

  it("places dates on the axis in months since September 2026", () => {
    expect(monthsSinceOrigin("2026-09-01T00:00:00Z")).toBe(0);
    expect(monthsSinceOrigin("2026-11-16T00:00:00Z")).toBeCloseTo(2.5);
  });
});

describe("format", () => {
  it("formats shares and days", () => {
    expect(pct(0.5018587, 1)).toBe("50.2%");
    expect(pct(null)).toBe("–");
    expect(share(1, 0)).toBeNull();
    expect(formatDay("2026-10-23T09:44:47Z")).toBe("23 Oct 2026");
  });

  it("names a version by its set and draft", () => {
    expect(parseVersion("2026-draft-3", true)).toEqual({
      set: "2026",
      draftLabel: "draft 3",
    });
    expect(parseVersion("2026-draft", true)).toEqual({
      set: "2026",
      draftLabel: "draft",
    });
    expect(parseVersion("2026", false)).toEqual({
      set: "2026",
      draftLabel: null,
    });
  });
});
