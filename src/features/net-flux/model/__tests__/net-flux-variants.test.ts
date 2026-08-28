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
      vegetation_emissions: 530,
      soil_emissions: 820,
      cropland_emissions: 150,
      livestock_emissions: 100,
      vegetation_removals: -710,
      soil_removals: -40,
    },
  ],
};

// 530 + 820 + 150 + 100 - 710 - 40
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
    expect(seriesLabel("non_trees_remaining_non_trees_removals")).toBe(
      "Non-trees remaining non-trees"
    );
    expect(seriesLabel("land_use_removals")).toBe("Land use");
  });

  it("names the two agriculture classes the backend does not label", () => {
    expect(seriesLabel("cropland_emissions")).toBe("Crop management");
    expect(seriesLabel("livestock_emissions")).toBe("Livestock");
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
      "Livestock",
      "Crop management",
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

describe("deriveNetFluxVariant — resilience", () => {
  it("survives an empty payload", () => {
    const empty: InsightWidget = { ...CATEGORY_WIDGET, data: [] };
    expect(deriveNetFluxVariant(empty, "gross").data).toEqual([]);
    expect(deriveNetFluxVariant(empty, "net").data).toEqual([]);
  });

  it("treats a missing metric on a row as zero, not NaN", () => {
    const sparse: InsightWidget = {
      ...CATEGORY_WIDGET,
      data: [{ year: 2020, vegetation_emissions: 100 }],
    };
    expect(deriveNetFluxVariant(sparse, "gross").data[0]["Net flux"]).toBe(100);
  });
});
