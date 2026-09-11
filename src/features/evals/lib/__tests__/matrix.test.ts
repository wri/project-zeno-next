import { describe, expect, it } from "vitest";
import type { CaseIndexEntry } from "../../model/types";
import {
  challengeRowDefs,
  composeTypeBreakdown,
  coverageMatrix,
  goldRowDefs,
  matrixCategory,
  typeBreakdown,
} from "../matrix";
import { caseRow, challengeInfoRow, passingChallengeRow } from "./fixtures";

function entry(partial: Partial<CaseIndexEntry> & { id: string; uid: string }) {
  return {
    group: "direct",
    status: "ready",
    expectedFields: [],
    impliedChecks: [],
    ...partial,
  };
}

const CASES: CaseIndexEntry[] = [
  entry({
    id: "ch-quant-001",
    uid: passingChallengeRow.uid,
    set: "quantification",
    group: "tcl",
    impliedChecks: ["aoi_id_match", "dataset_id_match", "date_extraction"],
  }),
  entry({
    id: "ch-quant-067",
    uid: challengeInfoRow.uid,
    set: "quantification",
    group: "grasslands",
    // agent_answer is shared (analysis+explanation): shared-only coverage
    impliedChecks: ["aoi_id_match", "agent_answer", "chart_produced"],
  }),
  entry({
    id: "ch-aoi-001",
    uid: "0000000000000001",
    set: "aoi",
    group: "direct",
    impliedChecks: ["aoi_id_match"],
  }),
  entry({
    id: "parked",
    uid: "0000000000000002",
    set: "aoi",
    status: "not doing",
    impliedChecks: ["aoi_id_match"],
  }),
];

describe("coverageMatrix", () => {
  const matrix = coverageMatrix(CASES, challengeRowDefs());
  const byLabel = Object.fromEntries(matrix.map((row) => [row.label, row]));

  it("keeps the full taxonomy, grey rows included", () => {
    expect(matrix.map((row) => row.label)).toHaveLength(11);
    expect(byLabel.Refusal.n).toBe(0);
    expect(byLabel.Identification.n).toBe(0);
  });

  it("maps Spatial to the aoi set and excludes parked cases", () => {
    expect(byLabel.Spatial.n).toBe(1);
    expect(byLabel.Spatial.cells.retrieval.dedicated).toBe(1);
  });

  it("separates dedicated from shared-only measurability per cell", () => {
    const quant = byLabel.Quantification;
    expect(quant.n).toBe(2);
    expect(quant.cells.retrieval.dedicated).toBe(2);
    // ch-quant-067 reaches analysis only via the shared agent_answer,
    // but output via the dedicated chart_produced
    expect(quant.cells.analysis).toEqual({ dedicated: 0, sharedOnly: 1 });
    expect(quant.cells.output.dedicated).toBe(1);
    expect(quant.cells.scope).toEqual({ dedicated: 0, sharedOnly: 0 });
  });
});

describe("goldRowDefs", () => {
  it("derives sorted group rows from the store", () => {
    const defs = goldRowDefs(CASES);
    expect(defs.map((def) => def.label)).toEqual([
      "direct",
      "grasslands",
      "tcl",
    ]);
  });
});

describe("typeBreakdown", () => {
  const casesByUid = new Map(CASES.map((c) => [c.uid, c]));

  it("tallies pass and primary-failure mix per type over measured rows", () => {
    const rows = [
      passingChallengeRow, // quantification, pass
      challengeInfoRow, // quantification, fail -> retrieval
      caseRow({
        uid: "ffffffffffffffff",
        id: "stale",
        checks: { aoi_id_match: 0 },
      }),
    ];
    const breakdown = typeBreakdown(rows, casesByUid, challengeRowDefs());
    const quant = breakdown.find((row) => row.label === "Quantification")!;
    expect(quant.n).toBe(2);
    expect(quant.pass).toBe(1);
    expect(quant.rate).toBe(0.5);
    expect(quant.byDimension.retrieval).toBe(1);
    // unmapped types stay n=0 (grey), stale rows never counted
    const refusal = breakdown.find((row) => row.label === "Refusal")!;
    expect(refusal.n).toBe(0);
    // "no case set yet" vs "set exists but not in this run"
    expect(refusal.hasCases).toBe(false);
    expect(breakdown.find((row) => row.label === "Spatial")!.hasCases).toBe(
      true
    );
  });
});

describe("composeTypeBreakdown", () => {
  const casesByUid = new Map(CASES.map((c) => [c.uid, c]));
  const aoiRow = caseRow({
    uid: "0000000000000001",
    id: "ch-aoi-001",
    checks: { aoi_id_match: 1 },
  });

  it("takes each type from the latest run that measured it", () => {
    const composed = composeTypeBreakdown(
      [
        {
          runId: "old-quant",
          started: "2026-09-01T10:00:00Z",
          rows: [passingChallengeRow, challengeInfoRow],
        },
        {
          runId: "new-aoi",
          started: "2026-09-02T10:00:00Z",
          rows: [aoiRow],
        },
      ],
      casesByUid,
      challengeRowDefs()
    );
    const byLabel = Object.fromEntries(composed.map((row) => [row.label, row]));
    expect(byLabel.Spatial.n).toBe(1);
    expect(byLabel.Spatial.runId).toBe("new-aoi");
    expect(byLabel.Quantification.n).toBe(2);
    expect(byLabel.Quantification.runId).toBe("old-quant");
    // unauthored types stay grey with no source run
    expect(byLabel.Refusal.n).toBe(0);
    expect(byLabel.Refusal.runId).toBeUndefined();
  });
});

describe("matrixCategory", () => {
  it("buckets cells into robust/thin/gap/none", () => {
    expect(matrixCategory({ dedicated: 3, sharedOnly: 0 }, 5)).toBe("robust");
    expect(matrixCategory({ dedicated: 2, sharedOnly: 0 }, 5)).toBe("thin");
    // shared-only coverage is at best thin: failures are unattributable
    expect(matrixCategory({ dedicated: 0, sharedOnly: 9 }, 9)).toBe("thin");
    expect(matrixCategory({ dedicated: 0, sharedOnly: 0 }, 5)).toBe("gap");
    expect(matrixCategory({ dedicated: 0, sharedOnly: 0 }, 0)).toBe("none");
  });
});
