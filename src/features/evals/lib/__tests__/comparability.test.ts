import { describe, expect, it } from "vitest";
import {
  comparabilityKey,
  isCanonicalChallenge,
  isDiagnostic,
  isOfficialGold,
} from "../comparability";
import { buildTrendSeries } from "../trends";
import { runSummary } from "./fixtures";

describe("comparabilityKey", () => {
  it("separates runs by profile and trial count, not caseset_version", () => {
    const a = runSummary({ casesetVersion: "aaaa" });
    const b = runSummary({ casesetVersion: "bbbb" });
    expect(comparabilityKey(a)).toBe(comparabilityKey(b));
    expect(comparabilityKey(runSummary({ ff: "experimental" }))).not.toBe(
      comparabilityKey(a)
    );
    expect(comparabilityKey(runSummary({ numTrials: 1 }))).not.toBe(
      comparabilityKey(a)
    );
  });
});

describe("canonical vs diagnostic", () => {
  const canonical = runSummary({
    caseset: "challenge",
    environment: "prod",
    ff: null,
    numTrials: 3,
  });

  it("recognises the canonical CHALLENGE configuration", () => {
    expect(isCanonicalChallenge(canonical)).toBe(true);
    expect(isDiagnostic(canonical)).toBe(false);
  });

  it("badges every deviation as diagnostic", () => {
    for (const partial of [
      { numTrials: 1 },
      { environment: "staging" },
      { ff: "experimental" },
    ]) {
      const run = runSummary({ ...canonical, ...partial });
      expect(isCanonicalChallenge(run)).toBe(false);
      expect(isDiagnostic(run)).toBe(true);
    }
  });

  it("never marks GOLD runs diagnostic; official GOLD needs 3 trials", () => {
    expect(isDiagnostic(runSummary({ numTrials: 1 }))).toBe(false);
    expect(isOfficialGold(runSummary({ numTrials: 3 }))).toBe(true);
    expect(isOfficialGold(runSummary({ numTrials: 1 }))).toBe(false);
  });
});

describe("buildTrendSeries", () => {
  it("groups by comparability and sorts points by start time", () => {
    const runs = [
      runSummary({ runId: "b", started: "2026-08-31T16:33:47Z" }),
      runSummary({ runId: "a", started: "2026-08-04T10:46:34Z" }),
      runSummary({
        runId: "c",
        started: "2026-08-01T09:30:02Z",
        ff: "experimental",
      }),
    ];
    const series = buildTrendSeries(runs);
    expect(series).toHaveLength(2);
    const defaultSeries = series.find((s) => s.label.includes("default"))!;
    expect(defaultSeries.points.map((p) => p.runId)).toEqual(["a", "b"]);
  });

  it("computes pass rate over measured rows and availability over all", () => {
    const run = runSummary({});
    run.buckets!.verdicts = { pass: 90, fail: 10, error: 5, uncovered: 4 };
    run.buckets!.rowsTotal = 109;
    const [series] = buildTrendSeries([run]);
    expect(series.points[0].passRate).toBeCloseTo(0.9, 12);
    expect(series.points[0].availability).toBeCloseTo(104 / 109, 12);
    expect(series.points[0].measured).toBe(100);
  });

  it("skips runs without a buckets block", () => {
    expect(buildTrendSeries([runSummary({ buckets: null })])).toEqual([]);
  });
});
