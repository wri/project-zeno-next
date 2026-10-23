import { describe, expect, it } from "vitest";

import { CONTEXT_LAYER_METADATA } from "@/app/constants/datasets";

import {
  mapWidgetLayer,
  mapWidgetViewportBbox,
  withTileDates,
  type MapWidgetLayer,
} from "../mapWidgets";

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
      datasetId: 4,
      parameters: { canopy_cover: 30 },
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
    expect(layer?.contextLayerName).toBe("driver");
  });

  it("uses the frontend's styling for SBTN natural sub-layers", () => {
    const layer = mapWidgetLayer(
      datasetConfig({
        context_layer: "natural_lands",
        context_layers: [
          { name: "natural_lands", tile_url: "/raster/natural-lands.png" },
        ],
      })
    );
    expect(layer?.contextTileUrl).toBe(
      CONTEXT_LAYER_METADATA.natural_lands.tile_url
    );
  });

  it("draws natural forest from the frontend's single-class tiles", () => {
    const layer = mapWidgetLayer(
      datasetConfig({
        context_layer: "natural_forest",
        context_layers: [
          { name: "natural_forest", tile_url: "/raster/natural-lands.png" },
        ],
      })
    );
    expect(layer?.contextTileUrl).toBe(
      CONTEXT_LAYER_METADATA.natural_forest.tile_url
    );
    expect(layer?.contextLayerName).toBe("natural_forest");
  });

  it("omits the context layer when the active name has no entry", () => {
    const layer = mapWidgetLayer(
      datasetConfig({ context_layer: "driver", context_layers: [] })
    );
    expect(layer?.contextTileUrl).toBeUndefined();
    expect(layer?.contextLayerName).toBeUndefined();
  });

  it("reduces config parameters to a first-value record for the legend", () => {
    const layer = mapWidgetLayer(
      datasetConfig({
        parameters: [
          { name: "canopy_cover", values: [30] },
          { name: "empty", values: [] },
          { name: 42, values: [1] },
          "junk",
        ],
      })
    );
    expect(layer?.parameters).toEqual({ canopy_cover: 30 });
  });

  it("falls back to the card's default canopy threshold when the config has none", () => {
    for (const parameters of [undefined, [], null]) {
      expect(mapWidgetLayer(datasetConfig({ parameters }))?.parameters).toEqual(
        { canopy_cover: 30 }
      );
    }
  });

  it("omits parameters for a dataset with no default threshold", () => {
    expect(
      mapWidgetLayer(datasetConfig({ dataset_id: 999 }))?.parameters
    ).toBeUndefined();
  });

  it("shows no canopy under natural forest, whose analysis ignores it", () => {
    const natural = (overrides: Record<string, unknown>) =>
      mapWidgetLayer(
        datasetConfig({
          context_layer: "natural_forest",
          context_layers: [
            { name: "natural_forest", tile_url: "/raster/natural-lands.png" },
          ],
          ...overrides,
        })
      )?.parameters;
    // Neither the card's default nor the config's own threshold.
    expect(natural({})).toBeUndefined();
    expect(
      natural({ parameters: [{ name: "canopy_cover", values: [30] }] })
    ).toBeUndefined();
    // Other parameters still show.
    expect(
      natural({
        parameters: [
          { name: "canopy_cover", values: [30] },
          { name: "other", values: ["x"] },
        ],
      })
    ).toEqual({ other: "x" });
    // The rule follows the selection, even when the sub-layer can't be drawn.
    expect(natural({ context_layers: [] })).toBeUndefined();
  });

  it("carries the config's date range for the legend chip", () => {
    const layer = mapWidgetLayer(
      datasetConfig({ start_date: "2024-01-01", end_date: "2024-12-31" })
    );
    expect(layer?.startDate).toBe("2024-01-01");
    expect(layer?.endDate).toBe("2024-12-31");
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

  it("returns undefined for absent or malformed viewports", () => {
    expect(mapWidgetViewportBbox({})).toBeUndefined();
    expect(mapWidgetViewportBbox({ viewport: { zoom: 4 } })).toBeUndefined();
    expect(
      mapWidgetViewportBbox({ viewport: { bbox: [-54, -27, -48] } })
    ).toBeUndefined();
    expect(
      mapWidgetViewportBbox({ viewport: { bbox: [-54, -27, -48, "x"] } })
    ).toBeUndefined();
  });
});

describe("withTileDates", () => {
  const ALERTS_TILE_URL =
    "https://tiles.globalforestwatch.org/gfw_integrated_dist_alerts/latest/dynamic/{z}/{x}/{y}.png?render_type=true_color&start_date=2026-09-17&end_date=2026-10-16";
  const layer: MapWidgetLayer = {
    kind: "dataset",
    title: "Integrated alerts",
    tileUrl: ALERTS_TILE_URL,
    datasetId: 11,
    startDate: "2026-09-17",
    endDate: "2026-10-16",
  };
  const range = { start: "2026-10-04", end: "2026-10-10" };

  it("rewrites the snapshot's date parameters and the legend dates", () => {
    const dated = withTileDates(layer, range);
    expect(dated.tileUrl).toBe(
      "https://tiles.globalforestwatch.org/gfw_integrated_dist_alerts/latest/dynamic/{z}/{x}/{y}.png?render_type=true_color&start_date=2026-10-04&end_date=2026-10-10"
    );
    expect(dated.startDate).toBe("2026-10-04");
    expect(dated.endDate).toBe("2026-10-10");
    // The input is not mutated.
    expect(layer.tileUrl).toBe(ALERTS_TILE_URL);
  });

  it("is idempotent", () => {
    const once = withTileDates(layer, range);
    expect(withTileDates(once, range)).toEqual(once);
  });

  it("appends the parameters when the snapshot's URL lacks them", () => {
    const bare = {
      ...layer,
      tileUrl:
        "https://tiles.example.org/alerts/{z}/{x}/{y}.png?render_type=true_color",
    };
    expect(withTileDates(bare, range).tileUrl).toBe(
      "https://tiles.example.org/alerts/{z}/{x}/{y}.png?render_type=true_color&start_date=2026-10-04&end_date=2026-10-10"
    );
    const noQuery = {
      ...layer,
      tileUrl: "https://tiles.example.org/alerts/{z}/{x}/{y}.png",
    };
    expect(withTileDates(noQuery, range).tileUrl).toBe(
      "https://tiles.example.org/alerts/{z}/{x}/{y}.png?start_date=2026-10-04&end_date=2026-10-10"
    );
  });

  it("leaves the context sub-layer and the primary-forest protocol alone", () => {
    const withContext = {
      ...layer,
      tileUrl: `pf://${ALERTS_TILE_URL}`,
      contextTileUrl: "https://tiles.example.org/natural-lands/{z}/{x}/{y}.png",
      contextLayerName: "natural_lands",
    };
    const dated = withTileDates(withContext, range);
    expect(dated.tileUrl.startsWith("pf://https://")).toBe(true);
    expect(dated.tileUrl).toContain("start_date=2026-10-04");
    expect(dated.contextTileUrl).toBe(withContext.contextTileUrl);
    expect(dated.contextLayerName).toBe("natural_lands");
  });
});
