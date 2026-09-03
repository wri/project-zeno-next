import { describe, expect, it } from "vitest";
import {
  deriveNetFluxVariant,
  isPaintReference,
  seriesGroup,
  seriesLabel,
} from "../net-flux-variants";
import type { InsightWidget } from "@/app/types/chat";

/**
 * Shaped like project-zeno's "Net GHG Flux by Category" chart: `series_fields`
 * in the backend's own order (emissions, then removals) and one row per year.
 */
const CATEGORY_WIDGET: InsightWidget = {
  type: "stacked-bar-with-line",
  title: "Net GHG Flux by Category",
  description: "",
  xAxis: "year",
  yAxis: "",
  seriesFields: [
    "vegetation_emissions",
    "soil_emissions",
    "cropland_emissions",
    "livestock_emissions",
    "vegetation_removals",
    "soil_removals",
  ],
  data: [
    {
      year: 2020,
      // The backend's flux fields are Mg (metric tons), unconverted — these
      // round-number-in-megatonnes values are chosen so `deriveNetFluxVariant`'s
      // Mg→Mt scaling produces the same friendly numbers the tests assert on.
      vegetation_emissions: 530_000_000,
      soil_emissions: 820_000_000,
      cropland_emissions: 150_000_000,
      livestock_emissions: 100_000_000,
      vegetation_removals: -710_000_000,
      soil_removals: -40_000_000,
    },
  ],
};

// (530 + 820 + 150 + 100 - 710 - 40) once scaled from Mg to Mt
const NET = 850;

describe("seriesGroup", () => {
  it("reads the side off the backend's field suffix", () => {
    expect(seriesGroup("vegetation_emissions")).toBe("emissions");
    expect(seriesGroup("tree_gain_removals")).toBe("removals");
  });

  it("returns null for a field that is not a flux series", () => {
    expect(seriesGroup("year")).toBeNull();
    expect(seriesGroup("aoi_id")).toBeNull();
  });
});

describe("seriesLabel", () => {
  it("maps the class prefix to the backend's own display label", () => {
    expect(seriesLabel("tree_loss_emissions")).toBe("Tree loss");
    expect(seriesLabel("organic_soil_emissions")).toBe("Organic soil");
    expect(seriesLabel("land_use_removals")).toBe("Land use");
  });

  it("shortens the removals side where the design pairs the two columns", () => {
    expect(seriesLabel("trees_remaining_trees_emissions")).toBe(
      "Trees remaining trees"
    );
    expect(seriesLabel("trees_remaining_trees_removals")).toBe(
      "Trees remaining"
    );
    expect(seriesLabel("non_trees_remaining_non_trees_emissions")).toBe(
      "Non-trees remaining non-trees"
    );
    expect(seriesLabel("non_trees_remaining_non_trees_removals")).toBe(
      "Non-trees"
    );
    expect(seriesLabel("mineral_soil_emissions")).toBe("Mineral soil");
    expect(seriesLabel("mineral_soil_removals")).toBe("Mineral");
  });

  it("marks the two agriculture classes as the fixed 2020 figure", () => {
    expect(seriesLabel("cropland_emissions")).toBe(
      "Cropland management (2020, static)"
    );
    expect(seriesLabel("livestock_emissions")).toBe("Livestock (2020, static)");
  });

  it("degrades readably for a class it has never seen", () => {
    expect(seriesLabel("peat_burning_emissions")).toBe("peat burning");
  });
});

describe("deriveNetFluxVariant — gross", () => {
  it("keeps the backend's series and order", () => {
    const variant = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    expect(variant.seriesFields).toEqual(CATEGORY_WIDGET.seriesFields);
  });

  it("adds the net-flux line, which the backend does not send", () => {
    const variant = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    expect(variant.data[0]["Net flux"]).toBe(NET);
  });

  it("colours every series, hatching the fixed-2020 agriculture ones", () => {
    const { colorMap } = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    for (const field of CATEGORY_WIDGET.seriesFields ?? []) {
      expect(colorMap[field]).toBeTruthy();
    }
    expect(colorMap.vegetation_emissions).toBe("#8c510a");
    expect(colorMap.vegetation_removals).toBe("#01665e");
    expect(isPaintReference(colorMap.cropland_emissions)).toBe(true);
    expect(isPaintReference(colorMap.livestock_emissions)).toBe(true);
  });

  it("groups the legend by suffix, emissions top-of-stack first", () => {
    const { legend } = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    expect(legend.layout).toBe("grouped");
    // Reversed relative to stacking order, so it reads down the bar.
    expect(legend.emissions.map((i) => i.label)).toEqual([
      "Livestock (2020, static)",
      "Cropland management (2020, static)",
      "Soil",
      "Vegetation",
    ]);
    expect(legend.removals.map((i) => i.label)).toEqual(["Vegetation", "Soil"]);
  });

  it("ignores non-series columns the backend may add to a row", () => {
    const withExtras: InsightWidget = {
      ...CATEGORY_WIDGET,
      seriesFields: [...(CATEGORY_WIDGET.seriesFields ?? []), "aoi_id"],
    };
    const variant = deriveNetFluxVariant(withExtras, "gross");
    expect(variant.seriesFields).not.toContain("aoi_id");
    expect(variant.data[0]["Net flux"]).toBe(NET);
  });
});

describe("deriveNetFluxVariant — net", () => {
  it("collapses to one signed bar carrying the same total", () => {
    const variant = deriveNetFluxVariant(CATEGORY_WIDGET, "net");
    expect(variant.seriesFields).toEqual(["Net source"]);
    expect(variant.data[0]["Net source"]).toBe(NET);
    expect(variant.data[0]["Net flux"]).toBe(NET);
  });

  it("leaves colorMap empty so the divergent tint drives the bar", () => {
    const variant = deriveNetFluxVariant(CATEGORY_WIDGET, "net");
    expect(variant.colorMap).toEqual({});
    expect(variant.divergentColors.positive).toBeTruthy();
    expect(variant.divergentColors.negative).toBeTruthy();
  });

  it("uses a flat legend", () => {
    const { legend } = deriveNetFluxVariant(CATEGORY_WIDGET, "net");
    expect(legend.layout).toBe("flat");
    expect(legend.emissions.map((i) => i.label)).toEqual([
      "Net source (+)",
      "Net sink (−)",
    ]);
    expect(legend.removals).toEqual([]);
  });
});

describe("deriveNetFluxVariant — y axis", () => {
  it("pins the round-number ticks the design draws", () => {
    // The frame's 2020 column: +1600 emissions stacked, -750 removals.
    const { yTicks, yDomain } = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    expect(yTicks).toEqual([-500, 0, 500, 1000, 1500]);
    // The domain has to hold every tick, or recharts drops the outliers.
    expect(yDomain[0]).toBeLessThanOrEqual(-500);
    expect(yDomain[1]).toBeGreaterThanOrEqual(1500);
  });

  it("measures the stack, not the largest single series", () => {
    // Six series none of which exceeds 820, but they stack to 1600.
    const { yDomain } = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    expect(yDomain[1]).toBeGreaterThan(1600);
    expect(yDomain[0]).toBeLessThan(-750);
  });

  it("rescales to the collapsed bar under the net measure", () => {
    const { yTicks } = deriveNetFluxVariant(CATEGORY_WIDGET, "net");
    // One +850 bar, so the axis no longer needs to reach 1500.
    expect(yTicks).toEqual([0, 200, 400, 600, 800]);
  });

  it("always labels zero", () => {
    for (const measure of ["gross", "net"] as const) {
      expect(deriveNetFluxVariant(CATEGORY_WIDGET, measure).yTicks).toContain(
        0
      );
    }
  });
});

describe("deriveNetFluxVariant — resilience", () => {
  it("survives an empty payload", () => {
    const empty: InsightWidget = { ...CATEGORY_WIDGET, data: [] };
    expect(deriveNetFluxVariant(empty, "gross").data).toEqual([]);
    expect(deriveNetFluxVariant(empty, "net").data).toEqual([]);
  });

  it("treats a missing metric on a row as zero, not NaN", () => {
    const sparse: InsightWidget = {
      ...CATEGORY_WIDGET,
      data: [{ year: 2020, vegetation_emissions: 100_000_000 }],
    };
    expect(deriveNetFluxVariant(sparse, "gross").data[0]["Net flux"]).toBe(100);
  });
});
