import { describe, expect, it } from "vitest";

import { mapWidgetLayer, mapWidgetViewportBbox } from "../mapWidgets";

const datasetConfig = (overrides: Record<string, unknown> = {}) => ({
  default_view: "map",
  dataset: {
    dataset_id: 4,
    dataset_name: "Tree cover loss",
    tile_url: "https://tiles.example.org/tcl/{z}/{x}/{y}.png?tcd=30",
    context_layer: null,
    context_layers: [],
    ...overrides,
  },
});

describe("mapWidgetLayer — dataset configs", () => {
  it("parses a dataset config into a renderable layer", () => {
    const layer = mapWidgetLayer(datasetConfig());
    expect(layer).toEqual({
      kind: "dataset",
      title: "Tree cover loss",
      tileUrl: "https://tiles.example.org/tcl/{z}/{x}/{y}.png?tcd=30",
    });
  });

  it("prefers the config.title override for the card header", () => {
    const layer = mapWidgetLayer({
      ...datasetConfig(),
      title: "Loss over Paraná",
    });
    expect(layer?.title).toBe("Loss over Paraná");
  });

  it("resolves the active context layer's tiles by name", () => {
    const layer = mapWidgetLayer(
      datasetConfig({
        context_layer: "driver",
        context_layers: [
          { name: "other", tile_url: "https://tiles.example.org/other" },
          { name: "driver", tile_url: "https://tiles.example.org/driver" },
        ],
      })
    );
    expect(layer?.contextTileUrl).toBe("https://tiles.example.org/driver");
  });

  it("omits the context layer when the active name has no entry", () => {
    const layer = mapWidgetLayer(
      datasetConfig({ context_layer: "driver", context_layers: [] })
    );
    expect(layer?.contextTileUrl).toBeUndefined();
  });

  it("routes primary-forest tiles through the pf:// protocol", () => {
    const layer = mapWidgetLayer(
      datasetConfig({
        tile_url:
          "https://tiles.example.org/umd_regional_primary_forest/{z}/{x}/{y}.png",
      })
    );
    expect(layer?.tileUrl).toMatch(/^pf:\/\//);
  });

  it("returns null when the dataset has no tile_url", () => {
    expect(mapWidgetLayer(datasetConfig({ tile_url: "" }))).toBeNull();
  });
});

describe("mapWidgetLayer — imagery configs", () => {
  it("parses an imagery config with a date-stamped fallback title", () => {
    const layer = mapWidgetLayer({
      imagery: {
        tile_url: "https://tiles.example.org/mosaic/{z}/{x}/{y}.png?url=abc",
        target_date: "2024-06-01",
      },
    });
    expect(layer).toEqual({
      kind: "imagery",
      title: "Sentinel-2 imagery, 2024-06-01",
      tileUrl: "https://tiles.example.org/mosaic/{z}/{x}/{y}.png?url=abc",
    });
  });

  it("falls back to a generic title without a target_date", () => {
    const layer = mapWidgetLayer({
      imagery: { tile_url: "https://tiles.example.org/mosaic" },
    });
    expect(layer?.title).toBe("Sentinel-2 imagery");
  });

  it("returns null when neither dataset nor imagery is present", () => {
    expect(mapWidgetLayer({ default_view: "map" })).toBeNull();
  });
});

describe("mapWidgetViewportBbox", () => {
  it("returns the override bbox when well-formed", () => {
    expect(
      mapWidgetViewportBbox({ viewport: { bbox: [-54, -27, -48, -22] } })
    ).toEqual([-54, -27, -48, -22]);
  });

  it("returns null for absent or malformed viewports", () => {
    expect(mapWidgetViewportBbox({})).toBeNull();
    expect(mapWidgetViewportBbox({ viewport: { zoom: 4 } })).toBeNull();
    expect(
      mapWidgetViewportBbox({ viewport: { bbox: [-54, -27, -48] } })
    ).toBeNull();
    expect(
      mapWidgetViewportBbox({ viewport: { bbox: [-54, -27, -48, "x"] } })
    ).toBeNull();
  });
});
