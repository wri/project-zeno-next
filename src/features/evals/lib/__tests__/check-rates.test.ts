import { describe, expect, it } from "vitest";
import { checkRates } from "../check-rates";
import { caseRow } from "./fixtures";

describe("checkRates", () => {
  const rows = [
    caseRow({
      uid: "a",
      id: "a",
      checks: { aoi_id_match: 1, dataset_id_match: 0, scope_match: 1 },
    }),
    caseRow({ uid: "b", id: "b", checks: { aoi_id_match: 1 } }),
    caseRow({ uid: "c", id: "c", checks: { aoi_id_match: 0 }, error: "x" }),
  ];

  it("reports dedicated rates in pipeline order", () => {
    const rates = checkRates(rows);
    expect(rates.map((r) => r.bucket)).toEqual([
      "scope",
      "retrieval",
      "analysis",
      "explanation",
      "output",
    ]);
    const retrieval = rates[1];
    // errored rows are not measurements
    expect(retrieval).toMatchObject({ passed: 2, evaluated: 3 });
    expect(retrieval.rate).toBeCloseTo(2 / 3);
    expect(retrieval.ciLow).toBeLessThan(retrieval.rate!);
  });

  it("marks unmeasured dimensions with a null rate", () => {
    const analysis = checkRates(rows)[2];
    expect(analysis).toMatchObject({ evaluated: 0, rate: null });
  });
});
