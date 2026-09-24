import { describe, expect, it } from "vitest";

import { DATASET_BY_ID, NET_FLUX_FEATURE_FLAG } from "@/app/constants/datasets";
import {
  CURATED_ANALYSES,
  curatedCatalogue,
  isAnalysableForSource,
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

  it("restricts tree cover gain to administrative areas", () => {
    // The analytics API fails the job for protected areas and KBAs (verified
    // 2026-09-24, PZB-1450); lift once upstream supports them.
    const gain = CURATED_ANALYSES.find((e) => e.datasetId === 5);
    expect(gain?.featureFlag).toBeUndefined();
    expect(gain?.aoiSources).toEqual(["gadm"]);
  });

  it("leaves every other entry ungated", () => {
    for (const entry of CURATED_ANALYSES) {
      if (entry.datasetId === 12 || entry.datasetId === 5) continue;
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
    "LGMS total net GHG flux",
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

    it("offers tree cover gain for an administrative area only", () => {
      expect(ids({ aoiSource: "gadm" })).toContain(5);
      for (const source of ["kba", "wdpa", "landmark", "custom"]) {
        expect(ids({ aoiSource: source })).not.toContain(5);
      }
    });

    it("leaves the unrestricted entries alone whatever the area", () => {
      const unrestricted = UNGATED.filter((e) => !e.aoiSources).map(
        (e) => e.datasetId
      );
      expect(ids({ aoiSource: "kba" })).toEqual(unrestricted);
      expect(ids({ enabledFlags: netFlux, aoiSource: "wdpa" })).toEqual(
        unrestricted
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

describe("isAnalysableForSource", () => {
  it("allows a source-restricted analysis only for its sources", () => {
    expect(isAnalysableForSource(5, "gadm")).toBe(true);
    expect(isAnalysableForSource(5, "wdpa")).toBe(false);
    expect(isAnalysableForSource(5, "kba")).toBe(false);
    expect(isAnalysableForSource(12, "landmark")).toBe(false);
  });

  it("matches the source case-insensitively", () => {
    expect(isAnalysableForSource(5, "GADM")).toBe(true);
    expect(isAnalysableForSource(5, "WDPA")).toBe(false);
  });

  it("allows an unrestricted analysis for every source", () => {
    expect(isAnalysableForSource(4, "wdpa")).toBe(true);
    expect(isAnalysableForSource(11, "landmark")).toBe(true);
  });

  it("does not restrict datasets outside the curated suite", () => {
    expect(isAnalysableForSource(9999, "wdpa")).toBe(true);
  });

  it("ignores feature flags: it answers whether the area is covered", () => {
    expect(isAnalysableForSource(12, "gadm")).toBe(true);
  });
});
