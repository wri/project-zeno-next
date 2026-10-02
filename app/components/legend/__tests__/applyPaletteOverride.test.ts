import { describe, expect, it } from "vitest";

import { applyPaletteOverride } from "../applyPaletteOverride";
import type { DatasetLegendConfig } from "@/app/constants/datasets";
import type { DatasetPalette } from "@/app/schemas/api/datasets/get";

function makeLegend(
  type: DatasetLegendConfig["type"],
  items: DatasetLegendConfig["items"]
): DatasetLegendConfig {
  return {
    title: "Test dataset",
    color: "#000000",
    items,
    type,
    info: "",
    note: "",
  };
}

function makePalette(overrides: Partial<DatasetPalette> = {}): DatasetPalette {
  return {
    dataset_id: 1,
    dataset_name: "Test dataset",
    categories: [],
    series_color: null,
    divergent_colors: null,
    legend_categories: true,
    ...overrides,
  };
}

const GRADIENT_ITEMS = [
  { label: "Low", color: "#eeeeee" },
  { label: "High", color: "#111111" },
];

describe("applyPaletteOverride", () => {
  it("returns the static legend unchanged when no palette has loaded", () => {
    const legend = makeLegend("categorical", GRADIENT_ITEMS);
    expect(applyPaletteOverride(legend, undefined)).toBe(legend);
  });

  it("replaces categorical items with the registry categories", () => {
    const legend = makeLegend("categorical", [
      { label: "Stale", color: "#ffffff" },
    ]);
    const result = applyPaletteOverride(
      legend,
      makePalette({
        categories: [
          { slug: "natural", label_en: "Natural", color: "#4CAF50" },
          { slug: "non_natural", label_en: "Non-natural", color: "#9E9E9E" },
        ],
      })
    );

    expect(result.items).toEqual([
      { label: "Natural", color: "#4CAF50" },
      { label: "Non-natural", color: "#9E9E9E" },
    ]);
  });

  it("applies the series color to symbol legends without expanding categories", () => {
    const legend = makeLegend("symbol", [{ label: "Loss", color: "#ffffff" }]);
    const result = applyPaletteOverride(
      legend,
      makePalette({ series_color: "#ABCDEF" })
    );

    expect(result.color).toBe("#ABCDEF");
    expect(result.items).toEqual([{ label: "Loss", color: "#ABCDEF" }]);
  });

  it("keeps hand-curated items when legend_categories is false", () => {
    const legend = makeLegend("categorical", [
      { label: "Natural", color: "#4CAF50" },
      { label: "Everything else", color: "#9E9E9E" },
    ]);
    const result = applyPaletteOverride(
      legend,
      makePalette({
        legend_categories: false,
        categories: [
          { slug: "natural", label_en: "Natural", color: "#4CAF50" },
          { slug: "cropland", label_en: "Cropland", color: "#fff183" },
        ],
      })
    );

    expect(result.items).toEqual(legend.items);
  });

  // Gradient legends read items[0]/items[last] as the min/max endpoints, so a
  // category list or a flattened series color would render nonsense there.
  it.each(["sequential", "divergent"] as const)(
    "leaves %s gradient legends untouched",
    (type) => {
      const legend = makeLegend(type, GRADIENT_ITEMS);
      const palette = makePalette({
        series_color: "#ABCDEF",
        categories: [{ slug: "a", label_en: "A", color: "#123456" }],
      });

      expect(applyPaletteOverride(legend, palette)).toBe(legend);
    }
  );
});
