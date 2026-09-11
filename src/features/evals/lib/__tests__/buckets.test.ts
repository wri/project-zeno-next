import { describe, expect, it } from "vitest";
import { bucketRates, summarizeBuckets } from "../buckets";
import {
  challengeInfoRow,
  errorRow,
  goldTrialRow,
  multiturnRow,
  passingChallengeRow,
  runSummary,
  uncoveredRow,
} from "./fixtures";

const ROWS = [
  goldTrialRow,
  multiturnRow,
  challengeInfoRow,
  passingChallengeRow,
  errorRow,
  uncoveredRow,
];

describe("summarizeBuckets", () => {
  const block = summarizeBuckets(ROWS);

  it("tallies dedicated checks per bucket (hand-computed over fixtures)", () => {
    expect(block.buckets.retrieval.dedicated).toEqual({
      passed: 12,
      evaluated: 17,
    });
    expect(block.buckets.analysis.dedicated).toEqual({
      passed: 4,
      evaluated: 4,
    });
    // info-only checks still count in bucket tallies (verdicts-only demotion)
    expect(block.buckets.explanation.dedicated).toEqual({
      passed: 5,
      evaluated: 6,
    });
    expect(block.buckets.output.dedicated).toEqual({ passed: 4, evaluated: 4 });
    expect(block.buckets.scope.dedicated).toEqual({ passed: 2, evaluated: 3 });
  });

  it("excludes errored rows from tallies and coverage, not from verdicts", () => {
    // errorRow carries t1.dataset_id_match=1 which must NOT be tallied
    expect(block.buckets.retrieval.rowsCovered).toBe(4);
    expect(block.verdicts).toEqual({
      pass: 2,
      fail: 2,
      error: 1,
      uncovered: 1,
    });
    expect(block.rowsTotal).toBe(6);
  });

  it("counts bucket coverage from any non-null check in the bucket", () => {
    expect(block.buckets.scope.rowsCovered).toBe(2);
    expect(block.buckets.analysis.rowsCovered).toBe(4);
  });
});

describe("bucketRates", () => {
  it("consumes the precomputed block from the run index", () => {
    const rates = bucketRates(runSummary({}).buckets!);
    expect(rates[0]).toEqual({
      bucket: "retrieval",
      rate: 407 / 438,
      evaluated: 438,
    });
    expect(rates.map((r) => r.bucket)).toEqual([
      "retrieval",
      "analysis",
      "explanation",
      "output",
      "scope",
    ]);
  });

  it("returns null where nothing was evaluated", () => {
    const summary = runSummary({});
    summary.buckets!.buckets.analysis.dedicated = { passed: 0, evaluated: 0 };
    expect(bucketRates(summary.buckets!)[1].rate).toBeNull();
  });
});
