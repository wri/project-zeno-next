import { describe, expect, it } from "vitest";

import { DATASET_BY_ID } from "@/app/constants/datasets";
import {
  CURATED_ANALYSES,
  curatedCatalogue,
  stripYearRangeSuffix,
} from "../curated-catalogue";

describe("CURATED_ANALYSES", () => {
  it("lists exactly the FE-catalogue datasets with a deterministic generator, in display order", () => {
    // Mirrors project-zeno charts/registry.py::DETERMINISTIC_GENERATORS minus
    // 9 (sLUC) and 12 (LGMS), which the FE catalogue does not expose.
    expect(CURATED_ANALYSES.map((e) => e.datasetId)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 10, 11,
    ]);
  });

  it("excludes the two registry datasets the FE does not expose", () => {
    const ids = new Set(CURATED_ANALYSES.map((e) => e.datasetId));
    expect(ids.has(9)).toBe(false);
    expect(ids.has(12)).toBe(false);
  });

  it("gives every entry a one-line description that fits a catalogue card", () => {
    for (const entry of CURATED_ANALYSES) {
      expect(entry.description.trim().length).toBeGreaterThan(0);
      expect(entry.description.length).toBeLessThan(80);
    }
  });

  it("expects two charts from tree cover loss and one from every other generator", () => {
    // charts/tcl.py emits annual loss + annual emissions; land_cover.py emits
    // either the composition pie or the transitions table, never both.
    for (const entry of CURATED_ANALYSES) {
      expect(entry.chartCountHint).toBe(entry.datasetId === 4 ? 2 : 1);
    }
  });
});

describe("stripYearRangeSuffix", () => {
  it.each([
    [
      "Forest greenhouse gas net flux (2001-2025)",
      "Forest greenhouse gas net flux",
    ],
    [
      "Forest greenhouse gas net flux (2001–2025)",
      "Forest greenhouse gas net flux",
    ],
    ["Tree cover loss (2000-2020)", "Tree cover loss"],
    ["Tree cover loss ( 2000 - 2020 ) ", "Tree cover loss"],
  ])("strips a trailing year range: %s", (input, expected) => {
    expect(stripYearRangeSuffix(input)).toBe(expected);
  });

  it.each([
    "Tree cover loss",
    "Tree cover (30%)",
    "Land GHG Monitoring System (LGMS)",
    "Loss (2001-2025) by driver",
    "Alerts (2025)",
  ])("leaves other names alone: %s", (name) => {
    expect(stripYearRangeSuffix(name)).toBe(name);
  });
});

describe("curatedCatalogue", () => {
  it("attaches each dataset's catalogue name, minus dataset 6's year range", () => {
    const specs = curatedCatalogue();
    expect(specs).toHaveLength(CURATED_ANALYSES.length);
    for (const spec of specs) {
      const catalogueName = DATASET_BY_ID[spec.datasetId].dataset_name;
      if (spec.datasetId === 6) {
        // "Forest greenhouse gas net flux (2001-2025)" in the FE catalogue.
        expect(catalogueName).toMatch(/\(2001-2025\)$/);
        expect(spec.datasetName).toBe("Forest greenhouse gas net flux");
      } else {
        expect(spec.datasetName).toBe(catalogueName);
      }
    }
  });

  it("names the well-known datasets as the catalogue does", () => {
    const byId = new Map(curatedCatalogue().map((s) => [s.datasetId, s]));
    expect(byId.get(4)?.datasetName).toBe("Tree cover loss");
    expect(byId.get(11)?.datasetName).toBe("Integrated alerts");
  });

  it("throws when an entry's dataset is missing from the catalogue", () => {
    expect(() => curatedCatalogue({})).toThrow(
      /Curated dataset 1 is missing from the FE catalogue/
    );
  });
});
