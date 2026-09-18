import { describe, expect, it } from "vitest";
import { FLUX_NODE_DESCRIPTIONS, fluxNodeDescription } from "../node-info";

/**
 * Every node project-zeno's `_hierarchy_rows` emits, by raw id
 * (`src/api/services/charts/lgms.py`). The science team wrote a description for
 * each, so a missing one here means a row would render without its info icon.
 */
const BACKEND_NODE_IDS = [
  "all_land",
  "land_use",
  "agriculture",
  "vegetation",
  "soil",
  "cropland",
  "livestock",
  "tree_loss",
  "tree_gain",
  "trees_remaining_trees",
  "non_trees_remaining_non_trees",
  "mineral_soil",
  "organic_soil",
];

describe("fluxNodeDescription", () => {
  it("describes every node the backend's hierarchy emits", () => {
    const missing = BACKEND_NODE_IDS.filter(
      (id) => fluxNodeDescription(id) === null
    );
    expect(missing).toEqual([]);
  });

  it("describes nothing the backend does not emit", () => {
    expect(Object.keys(FLUX_NODE_DESCRIPTIONS).sort()).toEqual(
      [...BACKEND_NODE_IDS].sort()
    );
  });

  it("returns null for an unknown class, so the row just loses its icon", () => {
    expect(fluxNodeDescription("peat_burning")).toBeNull();
  });

  it("keys the copy by id, not label, so a class rename can't drop it", () => {
    // The product renames this class to "Non-tree vegetation" (`lgms-labels`);
    // the backend id it arrives under is what the lookup uses.
    expect(fluxNodeDescription("non_trees_remaining_non_trees")).toContain(
      "short vegetation"
    );
  });

  it("states what each aggregate row sums", () => {
    expect(fluxNodeDescription("all_land")).toBe(
      "Sum of land use and agriculture."
    );
    expect(fluxNodeDescription("land_use")).toBe("Sum of vegetation and soil.");
    expect(fluxNodeDescription("soil")).toBe(
      "Sum of mineral soil and organic soil."
    );
    expect(fluxNodeDescription("agriculture")).toBe(
      "Sum of cropland management and livestock."
    );
  });
});
