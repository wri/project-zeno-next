import { describe, expect, it } from "vitest";
import { computeDailyOutcomeMix } from "../analytics/daily";
import { makeRow } from "./helpers";

describe("computeDailyOutcomeMix", () => {
  const rows = [
    makeRow({ traceId: "1", date: "2026-06-02", outcome: "ANSWER" }),
    makeRow({ traceId: "2", date: "2026-06-01", outcome: "ANSWER" }),
    makeRow({ traceId: "3", date: "2026-06-01", outcome: "ERROR" }),
    makeRow({ traceId: "4", date: null, outcome: "ANSWER" }), // no date -> skipped
    makeRow({ traceId: "5", date: "2026-06-01", outcome: null }), // null label -> skipped
  ];

  it("groups outcome counts per day in date order, skipping undated/unlabelled rows", () => {
    const mix = computeDailyOutcomeMix(rows, (r) => r.outcome);
    expect(mix.map((d) => d.date)).toEqual(["2026-06-01", "2026-06-02"]);

    const june1 = mix[0];
    expect(june1.total).toBe(2);
    expect(june1.counts).toEqual({ ANSWER: 1, ERROR: 1 });

    const june2 = mix[1];
    expect(june2.total).toBe(1);
    expect(june2.counts).toEqual({ ANSWER: 1 });
  });

  it("keys counts by whatever the label accessor returns", () => {
    const mix = computeDailyOutcomeMix(rows, (r) =>
      r.outcome === "ANSWER" ? "Success" : r.outcome ? "Failure" : null
    );
    expect(mix[0].counts).toEqual({ Success: 1, Failure: 1 });
  });
});
