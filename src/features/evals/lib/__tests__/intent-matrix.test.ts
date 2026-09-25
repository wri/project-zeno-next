import { describe, expect, it } from "vitest";
import type { CaseIndexEntry } from "../../model/types";
import { intentMatrix } from "../intent-matrix";
import { caseRow } from "./fixtures";

const ALL5 = [
  "scope_match",
  "dataset_id_match",
  "chart_integrity",
  "expected_text_match",
  "chart_produced",
];

function cases(
  n: number,
  set: string,
  group: string,
  impliedChecks: string[],
  prefix = `${set}-${group}`
): CaseIndexEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${i}`,
    uid: `${prefix}-${i}`,
    set,
    group,
    status: "ready",
    query: `${group} question ${i}`,
    expectedFields: [],
    impliedChecks,
  }));
}

function cell(
  matrix: ReturnType<typeof intentMatrix>,
  intent: string,
  datasetId: string | null
) {
  const row = matrix.rows.find((r) => r.def.key === intent)!;
  return row.cells.find((c) => c.datasetId === datasetId)!;
}

describe("intentMatrix (challenge)", () => {
  const store = [
    ...cases(12, "quantification", "tcl", ALL5),
    ...cases(12, "quantification", "ghg-flux", ["dataset_id_match"]),
    ...cases(4, "quantification", "grasslands", ALL5),
    ...cases(3, "aoi", "acronyms", ["aoi_id_match"]),
  ];

  it("is robust only with the case floor AND every required dimension", () => {
    const matrix = intentMatrix({ cases: store, rows: [], mode: "challenge" });
    expect(cell(matrix, "quantification", "4").coverage).toBe("robust");
    const ghg = cell(matrix, "quantification", "6");
    expect(ghg.coverage).toBe("thin");
    expect(ghg.missing).toEqual(["scope", "analysis", "explanation", "output"]);
    expect(cell(matrix, "quantification", "2").coverage).toBe("thin");
    expect(cell(matrix, "quantification", "5").coverage).toBe("none");
  });

  it("gives cross-cutting intents one spanning cell", () => {
    const matrix = intentMatrix({ cases: store, rows: [], mode: "challenge" });
    const spatial = matrix.rows.find((r) => r.def.key === "spatial")!;
    expect(spatial.cells).toHaveLength(1);
    expect(spatial.cells[0]).toMatchObject({ datasetId: null, cases: 3 });
    // 3 < floor even though retrieval (its only requirement) is covered
    expect(spatial.cells[0].coverage).toBe("thin");
  });

  it("scores cells from the composed rows", () => {
    const rows = [
      caseRow({
        uid: "quantification-tcl-0",
        id: "x",
        checks: { scope_match: 1 },
      }),
      caseRow({
        uid: "quantification-tcl-1",
        id: "y",
        checks: { scope_match: 0 },
      }),
      caseRow({ uid: "quantification-tcl-2", id: "z", checks: {}, error: "e" }),
    ];
    const matrix = intentMatrix({ cases: store, rows, mode: "challenge" });
    const tcl = cell(matrix, "quantification", "4");
    expect(tcl).toMatchObject({ measured: 2, passed: 1, rate: 0.5 });
    expect(tcl.example).toBe("tcl question 0");
    expect(cell(matrix, "quantification", "6").rate).toBeNull();
  });

  it("counts dataset-bound cases it cannot place as unmapped", () => {
    const matrix = intentMatrix({
      cases: cases(2, "trend", "mystery", ALL5),
      rows: [],
      mode: "challenge",
    });
    expect(matrix.rows.find((r) => r.def.key === "trend")!.unmapped).toBe(2);
  });
});

describe("intentMatrix (benchmark)", () => {
  it("gates on dimensions only, over the frozen sample", () => {
    const store = [
      ...cases(3, "quantification", "tcl", ALL5),
      ...cases(3, "quantification", "ghg-flux", ["dataset_id_match"]),
    ];
    const matrix = intentMatrix({
      cases: store,
      rows: [],
      mode: "benchmark",
      uids: new Set(["quantification-tcl-0", "quantification-ghg-flux-0"]),
    });
    expect(cell(matrix, "quantification", "4")).toMatchObject({
      cases: 1,
      coverage: "robust",
    });
    expect(cell(matrix, "quantification", "6").coverage).toBe("thin");
  });
});
