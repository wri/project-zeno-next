import { describe, expect, it } from "vitest";
import type { CaseIndexEntry } from "../../model/types";
import { rollupRun } from "../rollup";
import {
  caseRow,
  challengeInfoRow,
  errorRow,
  passingChallengeRow,
  uncoveredRow,
} from "./fixtures";

function entry(partial: Partial<CaseIndexEntry> & { id: string; uid: string }) {
  return {
    group: "direct",
    status: "ready",
    expectedFields: [],
    impliedChecks: [],
    ...partial,
  };
}

const CASES = new Map<string, CaseIndexEntry>(
  [
    entry({
      id: "ch-quant-067",
      uid: challengeInfoRow.uid,
      set: "quantification",
      group: "grasslands",
    }),
    entry({
      id: "ch-quant-001",
      uid: passingChallengeRow.uid,
      set: "quantification",
      group: "tcl",
      difficulty: "easy",
    }),
    entry({ id: "mt-007", uid: errorRow.uid, group: "multiturn" }),
    entry({ id: "x-001", uid: uncoveredRow.uid, set: "aoi" }),
    entry({ id: "ch-aoi-999", uid: "feedfacefeedface", set: "aoi" }),
    entry({
      id: "parked-1",
      uid: "0123456789abcdef",
      set: "aoi",
      status: "not doing",
    }),
  ].map((e) => [e.uid, e])
);

const staleRow = caseRow({
  uid: "ffffffffffffffff",
  id: "old-001",
  checks: { aoi_id_match: 1 },
});

describe("rollupRun", () => {
  const rollup = rollupRun(
    [challengeInfoRow, passingChallengeRow, errorRow, uncoveredRow, staleRow],
    CASES
  );

  it("counts verdicts over non-stale rows only", () => {
    expect(rollup.verdicts).toEqual({
      pass: 1,
      fail: 1,
      error: 1,
      uncovered: 1,
    });
    expect(rollup.stale).toEqual(["old-001"]);
  });

  it("treats errors as availability, not quality", () => {
    // 4 non-stale rows, 1 errored
    expect(rollup.availability).toBeCloseTo(0.75, 12);
    expect(rollup.errored).toEqual([
      { id: "mt-007", error: "t2: ReadTimeout" },
    ]);
    // the errored and uncovered rows never enter the rate denominator
    expect(rollup.overall.n).toBe(2);
  });

  it("computes rates with Wilson intervals", () => {
    expect(rollup.overall.rate).toBe(0.5);
    expect(rollup.overall.strictRate).toBe(0.5);
    expect(rollup.overall.ciLow).toBeGreaterThan(0);
    expect(rollup.overall.ciHigh).toBeLessThan(1);
  });

  it("rolls up set -> cohort -> difficulty", () => {
    const quant = rollup.bySet.quantification;
    expect(quant.n).toBe(2);
    expect(quant.byGroup.tcl.rate).toBe(1);
    expect(quant.byGroup.grasslands.rate).toBe(0);
    expect(quant.byDifficulty.easy.rate).toBe(1);
    expect(quant.byDifficulty.unlabelled.rate).toBe(0);
  });

  it("lists failing rows with their gating checks only", () => {
    expect(rollup.failing).toEqual([
      {
        id: "ch-quant-067",
        set: "quantification",
        group: "grasslands",
        difficulty: "unlabelled",
        failedChecks: ["dataset_id_match", "pull_source_match"],
      },
    ]);
  });

  it("reports unmeasured active cases, skipping parked ones", () => {
    expect(rollup.notRun).toEqual(["ch-aoi-999"]);
  });

  it("reports uncovered rows without counting them", () => {
    expect(rollup.uncovered).toEqual(["x-001"]);
  });
});
