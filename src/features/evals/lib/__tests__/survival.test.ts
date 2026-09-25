import { describe, expect, it } from "vitest";
import type { CaseIndexEntry, CaseRow } from "../../model/types";
import { survival } from "../survival";
import { caseRow } from "./fixtures";

const FULL = [
  "scope_match",
  "dataset_id_match",
  "chart_integrity",
  "expected_text_match",
  "chart_produced",
];

function entry(uid: string, impliedChecks: string[]): [string, CaseIndexEntry] {
  return [
    uid,
    {
      id: uid,
      uid,
      set: "quantification",
      group: "tcl",
      status: "ready",
      expectedFields: [],
      impliedChecks,
    },
  ];
}

const row = (uid: string, checks: CaseRow["checks"]) =>
  caseRow({ uid, id: uid, checks });

describe("survival", () => {
  it("peels failures off in scope-first order; survivors end at passes", () => {
    const cases = new Map([
      entry("p", FULL),
      entry("s", FULL),
      entry("r", FULL),
      entry("u", FULL),
    ]);
    const result = survival(
      [
        row("p", { scope_match: 1 }),
        row("s", { scope_match: 0, dataset_id_match: 0 }),
        row("r", { dataset_id_match: 0 }),
        row("u", { agent_answer: 0 }),
      ],
      cases,
      { minFullPipeline: 1 }
    );
    expect(result.population).toBe("full-pipeline");
    expect(result.start).toBe(4);
    expect(result.steps.map((s) => [s.stage, s.failed, s.survivors])).toEqual([
      ["scope", 1, 3],
      ["retrieval", 1, 2],
      ["analysis", 0, 2],
      ["explanation", 0, 2],
      ["output", 0, 2],
      ["unattributed", 1, 1],
    ]);
  });

  it("falls back to all measured rows when too few span all five", () => {
    const cases = new Map([entry("a", ["dataset_id_match"]), entry("b", FULL)]);
    const result = survival(
      [row("a", { dataset_id_match: 1 }), row("b", { scope_match: 1 })],
      cases,
      { minFullPipeline: 2 }
    );
    expect(result.population).toBe("all-measured");
    expect(result.start).toBe(2);
    // no unattributed step when nothing failed that way
    expect(result.steps.at(-1)?.stage).toBe("output");
  });
});
