import { describe, expect, it } from "vitest";

import { DATASET_BY_ID, NET_FLUX_FEATURE_FLAG } from "@/app/constants/datasets";
import {
  CURATED_ANALYSES,
  curatedCatalogue,
  stripYearRangeSuffix,
} from "../curated-catalogue";

describe("CURATED_ANALYSES", () => {
  it("lists exactly the FE-catalogue datasets with a deterministic generator, in display order", () => {
    // Mirrors project-zeno charts/registry.py::DETERMINISTIC_GENERATORS minus
    // 9 (sLUC), which the FE catalogue does not expose.
    expect(CURATED_ANALYSES.map((e) => e.datasetId)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12,
    ]);
  });

  it("excludes the registry dataset the FE does not expose", () => {
    const ids = new Set(CURATED_ANALYSES.map((e) => e.datasetId));
    expect(ids.has(9)).toBe(false);
  });

  it("gates LGMS behind ?ff=net-flux and the administrative areas it covers", () => {
    const lgms = CURATED_ANALYSES.find((e) => e.datasetId === 12);
    expect(lgms?.featureFlag).toBe(NET_FLUX_FEATURE_FLAG);
    expect(lgms?.aoiSources).toEqual(["gadm"]);
  });

  it("leaves every other entry ungated", () => {
    for (const entry of CURATED_ANALYSES) {
      if (entry.datasetId === 12) continue;
      expect(entry.featureFlag).toBeUndefined();
      expect(entry.aoiSources).toBeUndefined();
    }
  });

  it("gives every entry a one-line description that fits a catalogue card", () => {
    for (const entry of CURATED_ANALYSES) {
      expect(entry.description.trim().length).toBeGreaterThan(0);
      expect(entry.description.length).toBeLessThan(80);
    }
  });

  it("expects two cards from tree cover loss and LGMS, one from every other generator", () => {
    // charts/tcl.py emits annual loss + annual emissions; land_cover.py emits
    // either the composition pie or the transitions table, never both;
    // charts/lgms.py emits four that collapse to two cards.
    const two = new Set([4, 12]);
    for (const entry of CURATED_ANALYSES) {
      expect(entry.chartCountHint).toBe(two.has(entry.datasetId) ? 2 : 1);
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
  // Every ungated entry, which is what an unflagged caller gets back.
  const UNGATED = CURATED_ANALYSES.filter((e) => !e.featureFlag);
  const netFlux = new Set([NET_FLUX_FEATURE_FLAG]);

  it("attaches each dataset's catalogue name, minus dataset 6's year range", () => {
    const specs = curatedCatalogue();
    expect(specs).toHaveLength(UNGATED.length);
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
    expect(() => curatedCatalogue({ byId: {} })).toThrow(
      /Curated dataset 1 is missing from the FE catalogue/
    );
  });

  describe("gating", () => {
    const ids = (options?: Parameters<typeof curatedCatalogue>[0]) =>
      curatedCatalogue(options).map((s) => s.datasetId);

    it("withholds LGMS until its flag is opted into", () => {
      expect(ids()).not.toContain(12);
      expect(ids({ enabledFlags: new Set(["other"]) })).not.toContain(12);
      expect(ids({ enabledFlags: netFlux })).toContain(12);
    });

    it("offers LGMS for an administrative area only", () => {
      const flagged = { enabledFlags: netFlux };
      expect(ids({ ...flagged, aoiSource: "gadm" })).toContain(12);
      for (const source of ["kba", "wdpa", "landmark", "custom"]) {
        expect(ids({ ...flagged, aoiSource: source })).not.toContain(12);
      }
    });

    it("leaves the ungated entries alone whatever the area", () => {
      const ungated = UNGATED.map((e) => e.datasetId);
      expect(ids({ aoiSource: "kba" })).toEqual(ungated);
      expect(ids({ enabledFlags: netFlux, aoiSource: "wdpa" })).toEqual(
        ungated
      );
    });

    it("keeps display order when a gated entry is admitted", () => {
      expect(ids({ enabledFlags: netFlux, aoiSource: "gadm" })).toEqual([
        ...UNGATED.map((e) => e.datasetId),
        12,
      ]);
    });
  });
});
