import { describe, expect, it } from "vitest";
import {
  deriveNetFluxVariant,
  isPaintReference,
  NET_FLUX_FULL_DETAIL_FIELDS,
} from "../net-flux-variants";
import type { InsightWidget } from "@/app/types/chat";

// One row whose totals mirror the design's 2020 tooltip in miniature: every
// variant must collapse to the same +67 net flux.
const FULL_DETAIL_WIDGET: InsightWidget = {
  type: "stacked-bar-with-line",
  title: "Net flux over time",
  description: "",
  xAxis: "year",
  yAxis: "net_flux_mt",
  seriesFields: NET_FLUX_FULL_DETAIL_FIELDS,
  data: [
    {
      year: 2020,
      "Livestock (2020, static)": 6,
      "Cropland management (2020, static)": 4,
      "Organic soil": 20,
      "Mineral soil": 5,
      "Non-trees rem. non-trees": 3,
      "Trees rem. trees": 2,
      "Tree loss": 100,
      "Tree gain": -50,
      "Trees remaining": -10,
      "Non-trees": -5,
      Mineral: -8,
    },
  ],
};

const NET_FLUX = 67;

describe("deriveNetFluxVariant", () => {
  it("full + gross keeps every category field and sums them for the line", () => {
    const variant = deriveNetFluxVariant(FULL_DETAIL_WIDGET, "full", "gross");
    expect(variant.seriesFields).toEqual([
      "Tree loss",
      "Trees rem. trees",
      "Non-trees rem. non-trees",
      "Mineral soil",
      "Organic soil",
      "Cropland management (2020, static)",
      "Livestock (2020, static)",
      "Tree gain",
      "Trees remaining",
      "Non-trees",
      "Mineral",
    ]);
    expect(variant.data[0]["Net flux"]).toBe(NET_FLUX);
  });

  it("categories + gross collapses into the design's buckets", () => {
    const variant = deriveNetFluxVariant(
      FULL_DETAIL_WIDGET,
      "categories",
      "gross"
    );
    const row = variant.data[0];
    expect(row["Vegetation (emissions)"]).toBe(105);
    expect(row["Mineral soil"]).toBe(25);
    expect(row["Livestock (2020, static)"]).toBe(6);
    expect(row["Cropland management (2020, static)"]).toBe(4);
    expect(row["Vegetation (removals)"]).toBe(-65);
    expect(row["Soil"]).toBe(-8);
    expect(row["Net flux"]).toBe(NET_FLUX);
  });

  it("summary + gross collapses into agriculture + 2 land-use buckets", () => {
    const variant = deriveNetFluxVariant(
      FULL_DETAIL_WIDGET,
      "summary",
      "gross"
    );
    const row = variant.data[0];
    expect(row["Agriculture (static)"]).toBe(10);
    expect(row["Land use Emissions"]).toBe(130);
    expect(row["Land use Removals"]).toBe(-73);
    expect(row["Net flux"]).toBe(NET_FLUX);
  });

  it("net measure ignores detail and collapses to one signed bar + line", () => {
    for (const detail of ["full", "categories", "summary"] as const) {
      const variant = deriveNetFluxVariant(FULL_DETAIL_WIDGET, detail, "net");
      expect(variant.seriesFields).toEqual(["Net source"]);
      expect(variant.data[0]["Net source"]).toBe(NET_FLUX);
      expect(variant.data[0]["Net flux"]).toBe(NET_FLUX);
      // Left empty so the divergent positive/negative tint drives the bars.
      expect(variant.colorMap).toEqual({});
    }
  });

  it("maps every series to a colour, hatching the fixed-2020 agriculture ones", () => {
    const variant = deriveNetFluxVariant(FULL_DETAIL_WIDGET, "full", "gross");
    for (const field of variant.seriesFields) {
      expect(variant.colorMap[field]).toBeTruthy();
    }
    expect(variant.colorMap["Tree loss"]).toBe("#543005");
    expect(isPaintReference(variant.colorMap["Livestock (2020, static)"])).toBe(
      true
    );
    expect(
      isPaintReference(variant.colorMap["Cropland management (2020, static)"])
    ).toBe(true);
  });

  it("orders the legend top-of-stack first for emissions, per the design", () => {
    const { legend } = deriveNetFluxVariant(
      FULL_DETAIL_WIDGET,
      "full",
      "gross"
    );
    expect(legend.layout).toBe("grouped");
    expect(legend.emissions.map((i) => i.label)).toEqual([
      "Livestock (2020, static)",
      "Cropland management (2020, static)",
      "Organic soil",
      "Mineral soil",
      "Non-trees remaining non-trees",
      "Trees remaining trees",
      "Tree loss",
    ]);
    // Removals stack downward, so their stacking order already reads correctly.
    expect(legend.removals.map((i) => i.label)).toEqual([
      "Tree gain",
      "Trees remaining",
      "Non-trees",
      "Mineral soil",
    ]);
  });

  it("uses a flat legend for the net measure", () => {
    const { legend } = deriveNetFluxVariant(FULL_DETAIL_WIDGET, "full", "net");
    expect(legend.layout).toBe("flat");
    expect(legend.emissions.map((i) => i.label)).toEqual([
      "Net source (+)",
      "Net sink (−)",
    ]);
    expect(legend.removals).toEqual([]);
  });

  it("labels repeat across groups where the design repeats them", () => {
    const { legend } = deriveNetFluxVariant(
      FULL_DETAIL_WIDGET,
      "categories",
      "gross"
    );
    // "Vegetation" appears in both columns; the underlying data keys differ so
    // Recharts still sees unique dataKeys.
    expect(legend.emissions.map((i) => i.label)).toContain("Vegetation");
    expect(legend.removals.map((i) => i.label)).toContain("Vegetation");
  });
});
