import { describe, expect, it } from "vitest";
import type { CaseIndexEntry, RunSummary } from "../../model/types";
import type { HeadlineSource } from "../../model/benchmark";
import { eligibleRuns, northStar } from "../north-star";
import { caseRow } from "./fixtures";

function entry(
  uid: string,
  set: string,
  group: string
): [string, CaseIndexEntry] {
  return [
    uid,
    {
      id: uid,
      uid,
      set,
      group,
      status: "ready",
      expectedFields: [],
      impliedChecks: [],
    },
  ];
}

const CASES = new Map<string, CaseIndexEntry>([
  entry("a", "quantification", "tcl"),
  entry("b", "quantification", "ghg-flux"),
  entry("c", "aoi", "acronyms"),
  entry("d", "trend", "tcl"),
]);

const ROWS = [
  caseRow({ uid: "a", id: "a", checks: { dataset_id_match: 1 } }),
  caseRow({ uid: "b", id: "b", checks: { dataset_id_match: 0 } }),
  caseRow({ uid: "c", id: "c", checks: { aoi_id_match: 1 } }),
  caseRow({ uid: "d", id: "d", checks: { dataset_id_match: 1 } }),
  caseRow({ uid: "e", id: "e", checks: {}, error: "timeout" }),
];

const CHALLENGE: HeadlineSource = { kind: "challenge" };

function summary(partial: Partial<RunSummary>): RunSummary {
  return {
    runId: "r",
    started: "2026-09-01T00:00:00Z",
    environment: "prod",
    build: "b",
    ff: null,
    numTrials: 1,
    caseset: "challenge",
    casesetVersion: "v",
    judgeModel: null,
    workers: null,
    trialTimeout: null,
    resumed: false,
    path: "p",
    buckets: null,
    ...partial,
  };
}

describe("northStar", () => {
  it("reports the measured rate with a Wilson range", () => {
    const star = northStar({
      rows: ROWS,
      casesByUid: CASES,
      source: CHALLENGE,
    });
    // errors are availability, not quality: 3 of 4 measured
    expect(star.stat.n).toBe(4);
    expect(star.stat.passed).toBe(3);
    expect(star.stat.rate).toBeCloseTo(0.75);
    expect(star.stat.ciLow).toBeLessThan(0.75);
    expect(star.stat.ciHigh).toBeGreaterThan(0.75);
  });

  it("counts the datasets and intents the measured questions span", () => {
    const star = northStar({
      rows: ROWS,
      casesByUid: CASES,
      source: CHALLENGE,
    });
    expect(star.datasets).toBe(2); // tcl + ghg-flux; aoi is dataset-agnostic
    expect(star.intents).toBe(3); // quantification, spatial, trend
  });

  it("restricts a benchmark to its frozen uids", () => {
    const star = northStar({
      rows: ROWS,
      casesByUid: CASES,
      source: {
        kind: "benchmark",
        version: "v2026",
        frozen: "2026-11-12",
        uids: new Set(["a", "b"]),
        minTrials: 3,
      },
    });
    expect(star.stat.n).toBe(2);
    expect(star.stat.rate).toBeCloseTo(0.5);
  });
});

describe("eligibleRuns", () => {
  it("keeps CHALLENGE runs on the latest run's comparable series", () => {
    const runs = [
      summary({ runId: "old-staging", environment: "staging" }),
      summary({ runId: "p1", started: "2026-09-01T01:00:00Z" }),
      summary({ runId: "p2", started: "2026-09-01T02:00:00Z" }),
    ];
    expect(eligibleRuns(runs, CHALLENGE).map((r) => r.runId)).toEqual([
      "p1",
      "p2",
    ]);
  });

  it("prefers the canonical series when one exists", () => {
    const runs = [
      summary({ runId: "c3", numTrials: 3, started: "2026-09-01T00:00:00Z" }),
      summary({ runId: "d1", numTrials: 1, started: "2026-09-02T00:00:00Z" }),
    ];
    expect(eligibleRuns(runs, CHALLENGE).map((r) => r.runId)).toEqual(["c3"]);
  });

  it("admits only runs with enough trials for a benchmark", () => {
    const runs = [
      summary({ runId: "one", numTrials: 1 }),
      summary({ runId: "three", numTrials: 3 }),
    ];
    const source: HeadlineSource = {
      kind: "benchmark",
      version: "v2026",
      frozen: "2026-11-12",
      uids: new Set(),
      minTrials: 3,
    };
    expect(eligibleRuns(runs, source).map((r) => r.runId)).toEqual(["three"]);
  });
});
