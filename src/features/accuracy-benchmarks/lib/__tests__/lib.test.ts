import { describe, expect, it } from "vitest";
import { failureFlow } from "../flow";
import { formatDay, pct, versionLabel } from "../format";
import { mixSentence } from "../mix";
import { filterQuestions, NO_FILTER, questionStatus } from "../questions";
import { monthsSinceOrigin, pickRun, trendRuns } from "../runs";
import { tiersOf } from "../tiers";
import type { BenchmarkRunRef } from "../../model/types";
import { makePage, makeQuestion, makeStats, makeUseCase } from "./fixtures";

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
  });

  it("treats a group with no scored question as empty", () => {
    const tiers = tiersOf(
      makeStats({ scored: 0, everyTime: null, majority: null, anyTime: null })
    );
    expect(tiers.every((t) => t.count === 0)).toBe(true);
  });
});

describe("failureFlow", () => {
  it("peels failures off in attribution order and drops empty stages", () => {
    const flow = failureFlow(makePage({ unattributed: 1 }));
    expect(flow.leaves.map((l) => [l.key, l.count])).toEqual([
      ["retrieval", 3],
      ["explanation", 1],
      ["unattributed", 1],
    ]);
    expect(flow.accurate).toBe(10 - 5);
  });
});

describe("questions", () => {
  const pass = makeQuestion({ id: "a" });
  const flaky = makeQuestion({
    id: "b",
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
    useCases: ["UC2"],
    type: "causal",
    query: "Why is Riau burning?",
  });
  const errored = makeQuestion({ id: "d", verdict: "error" });

  it("classifies passes with a failed try as inconsistent", () => {
    expect([pass, flaky, failed, errored].map(questionStatus)).toEqual([
      "pass",
      "inconsistent",
      "fail",
      "error",
    ]);
  });

  it("filters by status, type, use case and searches the check labels", () => {
    const all = [pass, flaky, failed, errored];
    expect(
      filterQuestions(all, { ...NO_FILTER, status: "failed" }).map((q) => q.id)
    ).toEqual(["c", "d"]);
    expect(
      filterQuestions(all, { ...NO_FILTER, status: "inconsistent" }).map(
        (q) => q.id
      )
    ).toEqual(["b"]);
    expect(
      filterQuestions(all, { ...NO_FILTER, type: "causal" }).map((q) => q.id)
    ).toEqual(["c"]);
    expect(
      filterQuestions(all, { ...NO_FILTER, useCase: "UC2" }).map((q) => q.id)
    ).toEqual(["c"]);
    expect(
      filterQuestions(all, { ...NO_FILTER, search: "right place" }).map(
        (q) => q.id
      )
    ).toEqual(["b"]);
    expect(
      filterQuestions(all, { ...NO_FILTER, search: "RIAU" }).map((q) => q.id)
    ).toEqual(["c"]);
  });
});

describe("mixSentence", () => {
  it("names the top types, the places over 15% and the top datasets", () => {
    expect(
      mixSentence(makeUseCase(), { monitoring: "Monitoring", causal: "Causal" })
    ).toBe(
      "Mostly monitoring and causal questions, about sub-national areas and protected areas, using disturbance alerts and tree cover loss."
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
  it("formats shares, days and version labels", () => {
    expect(pct(0.5018587, 1)).toBe("50.2%");
    expect(pct(null)).toBe("–");
    expect(formatDay("2026-10-23T09:44:47Z")).toBe("23 Oct 2026");
    expect(versionLabel("2026-draft-3")).toBe("draft 3");
    expect(versionLabel("2026")).toBe("2026");
  });
});
