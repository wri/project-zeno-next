import { describe, expect, it } from "vitest";
import {
  LGMS_CLASS_DESCRIPTIONS,
  lgmsClassDescription,
} from "../lgms-descriptions";

/**
 * Every class id project-zeno's `LGMSChartGenerator` emits
 * (`src/api/services/charts/lgms.py`). The science team wrote a description
 * for each, so a missing one here means a tree row or a legend entry would
 * render without its info icon.
 */

/** Node ids of the annual-average tree, per `_hierarchy_rows`. */
const TREE_NODE_IDS = [
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

/**
 * Series classes of the three time-series charts, one list per DETAIL level,
 * as `seriesClass` yields them: the category roll-up's
 * `cropland_management_emissions` field is folded to the raw class `cropland`.
 */
const SERIES_CLASS_IDS: Record<string, string[]> = {
  "Full detail": [
    "tree_loss",
    "trees_remaining_trees",
    "non_trees_remaining_non_trees",
    "mineral_soil",
    "organic_soil",
    "cropland",
    "livestock",
    "tree_gain",
  ],
  Category: ["vegetation", "soil", "cropland", "livestock"],
  Summary: ["land_use", "agriculture"],
};

const EVERY_BACKEND_CLASS_ID = [
  ...new Set([...TREE_NODE_IDS, ...Object.values(SERIES_CLASS_IDS).flat()]),
];

describe("lgmsClassDescription", () => {
  it("describes every node the annual-average tree receives", () => {
    const missing = TREE_NODE_IDS.filter(
      (id) => lgmsClassDescription(id) === null
    );
    expect(missing).toEqual([]);
  });

  it.each(Object.entries(SERIES_CLASS_IDS))(
    "describes every class the %s time series draws",
    (_, classIds) => {
      const missing = classIds.filter(
        (id) => lgmsClassDescription(id) === null
      );
      expect(missing).toEqual([]);
    }
  );

  it("describes nothing the backend does not emit", () => {
    expect(Object.keys(LGMS_CLASS_DESCRIPTIONS).sort()).toEqual(
      [...EVERY_BACKEND_CLASS_ID].sort()
    );
  });

  it("returns null for an unknown class, so its row or entry just loses the icon", () => {
    expect(lgmsClassDescription("peat_burning")).toBeNull();
  });

  it("keys the copy by id, not label, so a class rename can't drop it", () => {
    // The product renames this class to "Non-tree vegetation" (`lgms-labels`);
    // the backend id it arrives under is what the lookup uses.
    expect(lgmsClassDescription("non_trees_remaining_non_trees")).toContain(
      "short vegetation"
    );
  });

  it("states what each aggregate class sums", () => {
    expect(lgmsClassDescription("all_land")).toBe(
      "Sum of land use and agriculture."
    );
    expect(lgmsClassDescription("land_use")).toBe(
      "Sum of vegetation and soil."
    );
    expect(lgmsClassDescription("soil")).toBe(
      "Sum of mineral soil and organic soil."
    );
    expect(lgmsClassDescription("agriculture")).toBe(
      "Sum of cropland management and livestock."
    );
  });
});
