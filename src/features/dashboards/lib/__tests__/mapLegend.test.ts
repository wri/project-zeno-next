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

describe("mapLegendFor", () => {
  it("has no legend for a layer without a dataset card (imagery)", () => {
    expect(mapLegendFor(layer({ kind: "imagery" }))).toBeNull();
    expect(mapLegendFor(layer({ datasetId: -1 }))).toBeNull();
  });

  it("lists a symbol legend's classes in order", () => {
    const legend = mapLegendFor(layer({ datasetId: 11 }));
    expect(legend?.title).toBe("Integrated Disturbance Alerts");
    expect(legend?.classes).toEqual([
      { label: "Low confidence", color: "#EDA4C2" },
      { label: "High confidence", color: "#DC6699" },
      { label: "Highest confidence", color: "#C92A6D" },
    ]);
    expect(legend?.scale).toBeNull();
  });

  it("lists every class of a categorical legend", () => {
    const legend = mapLegendFor(layer({ datasetId: 1 }));
    expect(legend?.classes).toHaveLength(9);
    expect(legend?.classes[0]).toEqual({ label: "forest", color: "#246E24" });
  });

  it("gives a divergent legend a scale with its end labels, not classes", () => {
    const legend = mapLegendFor(layer({ datasetId: 6 }));
    expect(legend?.classes).toEqual([]);
    expect(legend?.scale).toMatchObject({
      kind: "divergent",
      minLabel: "<-1500 (sink)",
      maxLabel: ">1500 (source)",
      unit: "tCO2e/ha",
    });
    expect(legend?.scale?.colors[0]).toBe("#151d44");
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

  it("names the context layer the data sits within", () => {
    const legend = mapLegendFor(
      layer({
        datasetId: TREE_COVER_LOSS_DATASET_ID,
        contextTileUrl: "https://tiles.example.org/pf/{z}/{x}/{y}.png",
        contextLayerName: "primary_forest",
      })
    );
    const pf = CONTEXT_LAYER_METADATA.primary_forest.legend;
    expect(legend?.context).toEqual({
      title: "Primary Forests (2001)",
      color: pf?.items?.[0]?.color,
      info: pf?.info,
    });
  });

  it("has no context without the context layer's tiles", () => {
    const legend = mapLegendFor(
      layer({
        datasetId: TREE_COVER_LOSS_DATASET_ID,
        contextLayerName: "primary_forest",
      })
    );
    expect(legend?.context).toBeNull();
  });
});
