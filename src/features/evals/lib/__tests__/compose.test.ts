import { describe, expect, it } from "vitest";
import type { CaseIndexEntry, CaseRow } from "../../model/types";
import { composeRowsByIntent, compositionSnapshots } from "../compose";
import type { SnapshotRun } from "../compose";
import { caseRow } from "./fixtures";

function entry(uid: string, set: string, group: string): CaseIndexEntry {
  return {
    id: uid,
    uid,
    set,
    group,
    status: "ready",
    expectedFields: [],
    impliedChecks: [],
  };
}

const CASES = new Map<string, CaseIndexEntry>(
  [
    entry("q1", "quantification", "tcl"),
    entry("q2", "quantification", "tcl"),
    entry("t1", "trend", "tcl"),
  ].map((e) => [e.uid, e])
);

const pass = (uid: string): CaseRow =>
  caseRow({ uid, id: uid, checks: { dataset_id_match: 1 } });
const fail = (uid: string): CaseRow =>
  caseRow({ uid, id: uid, checks: { dataset_id_match: 0 } });

function run(
  runId: string,
  started: string,
  rows: CaseRow[],
  extra: Partial<SnapshotRun> = {}
): SnapshotRun {
  return {
    runId,
    started,
    build: "b",
    casesetVersion: "v1",
    numTrials: 1,
    rows,
    ...extra,
  };
}

describe("composeRowsByIntent", () => {
  it("takes each intent from the newest run that measured it", () => {
    const older = run("r1", "2026-09-01T10:00Z", [fail("q1"), pass("t1")]);
    const newer = run("r2", "2026-09-02T10:00Z", [pass("q1"), pass("q2")]);
    const { rows, sources } = composeRowsByIntent([older, newer], CASES);
    expect(rows.map((r) => `${r.uid}:${r.checks.dataset_id_match}`)).toEqual([
      "q1:1",
      "q2:1",
      "t1:1",
    ]);
    expect(sources).toEqual([
      { intent: "quantification", runId: "r2" },
      { intent: "trend", runId: "r1" },
    ]);
  });

  it("ignores stale rows and rows not in the store", () => {
    const r = run("r1", "2026-09-01T10:00Z", [
      caseRow({ ...pass("q1"), staleCase: true }),
      pass("zz"),
    ]);
    expect(composeRowsByIntent([r], CASES).rows).toEqual([]);
  });
});

describe("compositionSnapshots", () => {
  it("emits one cumulative snapshot per run, oldest first", () => {
    const r1 = run("r1", "2026-09-01T10:00Z", [fail("q1"), fail("q2")]);
    const r2 = run("r2", "2026-09-02T10:00Z", [pass("t1")], { build: "b2" });
    const r3 = run("r3", "2026-09-03T10:00Z", [pass("q1"), pass("q2")]);
    const snaps = compositionSnapshots([r3, r1, r2], CASES);
    expect(snaps.map((s) => s.runId)).toEqual(["r1", "r2", "r3"]);
    // r2 adds trend on top of r1's failing quantification rows
    expect(snaps[1].rows).toHaveLength(3);
    expect(snaps[1].build).toBe("b2");
    // r3 supersedes quantification
    expect(
      snaps[2].rows.filter((r) => r.checks.dataset_id_match === 1)
    ).toHaveLength(3);
  });
});
