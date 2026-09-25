import { describe, expect, it } from "vitest";
import type { CaseIndexEntry } from "../../model/types";
import { caseDatasetIds, caseIntentKey } from "../case-facets";

function entry(partial: Partial<CaseIndexEntry>): CaseIndexEntry {
  return {
    id: "x",
    uid: "u",
    group: "",
    status: "ready",
    expectedFields: [],
    impliedChecks: [],
    ...partial,
  };
}

describe("caseIntentKey", () => {
  it("prefers the stamped intent", () => {
    expect(caseIntentKey(entry({ set: "aoi", intent: "spatial" }))).toBe(
      "spatial"
    );
  });

  it("falls back to the set, mapping aoi to spatial", () => {
    expect(caseIntentKey(entry({ set: "aoi" }))).toBe("spatial");
    expect(caseIntentKey(entry({ set: "trend" }))).toBe("trend");
  });

  it("is null for cases outside the taxonomy (GOLD)", () => {
    expect(caseIntentKey(entry({ group: "direct" }))).toBeNull();
  });
});

describe("caseDatasetIds", () => {
  it("prefers stamped dataset ids, including an empty list", () => {
    expect(
      caseDatasetIds(entry({ set: "trend", group: "tcl", datasetIds: ["9"] }))
    ).toEqual(["9"]);
    expect(
      caseDatasetIds(entry({ set: "trend", group: "tcl", datasetIds: [] }))
    ).toEqual([]);
  });

  it("falls back to the group slug for dataset-grouped sets", () => {
    expect(
      caseDatasetIds(entry({ set: "quantification", group: "tcl" }))
    ).toEqual(["4"]);
    expect(
      caseDatasetIds(entry({ set: "comparison", group: "ghg-flux" }))
    ).toEqual(["6"]);
  });

  it("never reads aoi groups as datasets", () => {
    expect(caseDatasetIds(entry({ set: "aoi", group: "acronyms" }))).toEqual(
      []
    );
  });

  it("returns [] for an unknown group rather than guessing", () => {
    expect(
      caseDatasetIds(entry({ set: "quantification", group: "mystery" }))
    ).toEqual([]);
  });
});
