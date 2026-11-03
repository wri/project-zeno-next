import { describe, expect, it } from "vitest";

import {
  CONTEXT_LAYER_METADATA,
  TREE_COVER_LOSS_DATASET_ID,
} from "@/app/constants/datasets";
import { mapLegendFor } from "../mapLegend";
import type { MapWidgetLayer } from "../mapWidgets";

const layer = (overrides: Partial<MapWidgetLayer> = {}): MapWidgetLayer => ({
  kind: "dataset",
  title: "Map",
  tileUrl: "https://tiles.example.org/{z}/{x}/{y}.png",
  ...overrides,
});

/** The symbology of a layer that must have a legend. */
const symbologyOf = (l: MapWidgetLayer) => {
  const legend = mapLegendFor(l);
  if (!legend) throw new Error("expected a legend");
  return legend.symbology;
};

/** The classes of a layer whose legend must be classes. */
const classesOf = (l: MapWidgetLayer) => {
  const symbology = symbologyOf(l);
  if (symbology.kind !== "classes") throw new Error("expected classes");
  return symbology.classes;
};

describe("mapLegendFor", () => {
  it.each([
    ["imagery", layer({ kind: "imagery" })],
    ["a dataset without a card", layer({ datasetId: -1 })],
  ])("has no legend for %s", (_, l) => {
    expect(mapLegendFor(l)).toBeNull();
  });

  it("lists a symbol legend's classes in order", () => {
    const l = layer({ datasetId: 11 });
    expect(mapLegendFor(l)?.title).toBe("Integrated Disturbance Alerts");
    expect(classesOf(l)).toEqual([
      { label: "Low confidence", color: "#EDA4C2" },
      { label: "High confidence", color: "#DC6699" },
      { label: "Highest confidence", color: "#C92A6D" },
    ]);
  });

  it("lists every class of a categorical legend", () => {
    const classes = classesOf(layer({ datasetId: 1 }));
    expect(classes).toHaveLength(9);
    expect(classes[0]).toEqual({ label: "forest", color: "#246E24" });
  });

  it("gives a divergent legend a scale with its end labels, not classes", () => {
    const symbology = symbologyOf(layer({ datasetId: 6 }));
    expect(symbology).toMatchObject({
      kind: "divergent",
      minLabel: "<-1500 (sink)",
      maxLabel: ">1500 (source)",
      unit: "tCO2e/ha",
    });
    expect(symbology.kind !== "classes" && symbology.colors[0]).toBe("#151d44");
  });

  it("puts the year range and canopy on one line", () => {
    const legend = mapLegendFor(
      layer({
        datasetId: TREE_COVER_LOSS_DATASET_ID,
        parameters: { canopy_cover: 30 },
        startDate: "2001-01-01",
        endDate: "2025-12-31",
      })
    );
    expect(legend?.params).toBe("YEARS 2001–25 · CANOPY > 30%");
  });

  it("has an empty settings line when the layer has none", () => {
    expect(mapLegendFor(layer({ datasetId: 1 }))?.params).toBe("");
  });

  const pf = CONTEXT_LAYER_METADATA.primary_forest.legend;
  it.each([
    [
      "names the context layer the data sits within",
      "https://tiles.example.org/pf/{z}/{x}/{y}.png",
      {
        title: "Primary Forests (2001)",
        color: pf?.items?.[0]?.color,
        info: pf?.info,
      },
    ],
    ["has no context without the context layer's tiles", undefined, null],
  ])("%s", (_, contextTileUrl, expected) => {
    const legend = mapLegendFor(
      layer({
        datasetId: TREE_COVER_LOSS_DATASET_ID,
        contextTileUrl,
        contextLayerName: "primary_forest",
      })
    );
    expect(legend?.context).toEqual(expected);
  });
});
