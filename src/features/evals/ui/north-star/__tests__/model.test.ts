import { describe, expect, it } from "vitest";
import type { CaseIndexEntry, RunDetail } from "../../../model/types";
import { caseRow } from "../../../lib/__tests__/fixtures";
import { buildNorthStarModel } from "../model";

function entry(uid: string, set: string, group: string): CaseIndexEntry {
  return {
    id: uid,
    uid,
    set,
    group,
    status: "ready",
    query: `${uid}?`,
    expectedFields: [],
    impliedChecks: ["dataset_id_match"],
  };
}

const CASES = new Map(
  [entry("q1", "quantification", "tcl"), entry("t1", "trend", "tcl")].map(
    (e) => [e.uid, e]
  )
);

function run(
  runId: string,
  started: string,
  build: string,
  rows: RunDetail["rows"]
): RunDetail {
  return {
    runId,
    started,
    environment: "prod",
    build,
    ff: null,
    numTrials: 1,
    caseset: "challenge",
    casesetVersion: "v1",
    judgeModel: null,
    workers: null,
    trialTimeout: null,
    resumed: false,
    rows,
    buckets: null,
  };
}

describe("buildNorthStarModel", () => {
  const runs = [
    run("r1", "2026-09-01T10:00:00Z", "quant-build", [
      caseRow({ uid: "q1", id: "q1", checks: { dataset_id_match: 1 } }),
    ]),
    run("r2", "2026-09-01T11:00:00Z", "trend-build", [
      caseRow({ uid: "t1", id: "t1", checks: { dataset_id_match: 0 } }),
    ]),
  ];

  it("wires every layer over the latest composition", () => {
    const model = buildNorthStarModel({
      runs,
      casesByUid: CASES,
      source: { kind: "challenge" },
    })!;
    expect(model.star.stat).toMatchObject({ n: 2, passed: 1 });
    expect(model.trend.map((p) => p.stat.n)).toEqual([1, 2]);
    expect(model.checkHistory.retrieval).toEqual([1, 0.5]);
    expect(model.survival.start).toBe(2);
    expect(model.trials).toBe(1);
  });

  it("drops build-change markers on composed CHALLENGE views", () => {
    const model = buildNorthStarModel({
      runs,
      casesByUid: CASES,
      source: { kind: "challenge" },
    })!;
    expect(model.trend[0].marker?.kinds).toEqual(["baseline"]);
    expect(model.trend[1].marker).toBeUndefined();
  });

  it("returns null with no runs", () => {
    expect(
      buildNorthStarModel({
        runs: [],
        casesByUid: CASES,
        source: { kind: "challenge" },
      })
    ).toBeNull();
  });
});
