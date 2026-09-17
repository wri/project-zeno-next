import { describe, expect, it } from "vitest";
import { lgmsClassLabel, LGMS_CLASS_RENAMES } from "../lgms-labels";

describe("lgmsClassLabel", () => {
  it("renames the non-trees class to the product's wording", () => {
    expect(
      lgmsClassLabel(
        "non_trees_remaining_non_trees",
        "Non-trees remaining non-trees"
      )
    ).toBe("Non-tree vegetation");
  });

  it("passes any other class's label through untouched", () => {
    expect(lgmsClassLabel("mineral_soil", "Mineral soil")).toBe("Mineral soil");
    expect(lgmsClassLabel("peat_burning", "peat burning")).toBe("peat burning");
  });

  it("keys renames by the backend's raw class id", () => {
    expect(Object.keys(LGMS_CLASS_RENAMES)).toEqual([
      "non_trees_remaining_non_trees",
    ]);
  });
});
