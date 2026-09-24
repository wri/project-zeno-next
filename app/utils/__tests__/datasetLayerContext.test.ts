import { describe, it, expect } from "vitest";
import {
  getDatasetLayerContextProps,
  buildDatasetLayers,
  toLayerEntries,
} from "../datasetLayerContext";
import type { DatasetInfo } from "@/app/types/chat";

const BASE_DATASET: DatasetInfo = {
  dataset_id: 4,
  dataset_name: "Tree cover loss",
  source: "",
  data_layer: "Tree cover loss",
  tile_url:
    "https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png?tree_cover_density_threshold=30&render_type=true_color",
  context_layer: null,
  context_layers: [],
  threshold: 30,
  methodology: "",
  cautions: "",
  citation: "",
  reason: "",
  description: "",
};

describe("getDatasetLayerContextProps — vector branch", () => {
  it("sets sourceLayer and does not wrap the tile URL in the pf:// protocol", () => {
    const dataset: DatasetInfo = {
      ...BASE_DATASET,
      context_layer: "intact_forest",
      context_layers: [
        {
          name: "intact_forest",
          tile_url:
            "https://tiles.globalforestwatch.org/ifl_intact_forest_landscapes/v2021/default/{z}/{x}/{y}.pbf",
          source_layer: "ifl_intact_forest_landscapes",
        },
      ],
    };

    const result = getDatasetLayerContextProps(dataset);

    expect(result.contextLayer).toBeDefined();
    expect(result.contextLayer!.sourceLayer).toBe(
      "ifl_intact_forest_landscapes"
    );
    // pf:// is a MapLibre protocol handler for PNG alpha compositing — must not touch vector URLs
    expect(result.contextLayer!.tileUrl).not.toMatch(/^pf:\/\//);
    expect(result.contextLayer!.tileUrl).toContain(".pbf");
  });

  it("does not wrap the tile URL in pf:// when type is explicitly 'vector'", () => {
    const dataset: DatasetInfo = {
      ...BASE_DATASET,
      context_layer: "intact_forest",
      context_layers: [
        {
          name: "intact_forest",
          tile_url:
            "https://tiles.globalforestwatch.org/ifl_intact_forest_landscapes/v2021/default/{z}/{x}/{y}.pbf",
          type: "vector",
        },
      ],
    };

    const result = getDatasetLayerContextProps(dataset);

    expect(result.contextLayer).toBeDefined();
    expect(result.contextLayer!.tileUrl).not.toMatch(/^pf:\/\//);
    // source_layer not set → sourceLayer is undefined
    expect(result.contextLayer!.sourceLayer).toBeUndefined();
  });
});

describe("getDatasetLayerContextProps — raster branch", () => {
  it("returns undefined contextLayer when context_layer is null", () => {
    const result = getDatasetLayerContextProps(BASE_DATASET);
    expect(result.contextLayer).toBeUndefined();
  });

  it("wraps the primary forest tile URL in the pf:// protocol", () => {
    const dataset: DatasetInfo = {
      ...BASE_DATASET,
      context_layer: "primary_forest",
      context_layers: [
        {
          name: "primary_forest",
          tile_url:
            "https://tiles.globalforestwatch.org/umd_regional_primary_forest/v201901/default/{z}/{x}/{y}.png",
        },
      ],
    };

    const result = getDatasetLayerContextProps(dataset);

    expect(result.contextLayer).toBeDefined();
    // pf:// protocol strips the black background from Primary Forest PNGs
    expect(result.contextLayer!.tileUrl).toMatch(/^pf:\/\//);
    expect(result.contextLayer!.sourceLayer).toBeUndefined();
  });

  it("leaves non-primary-forest raster URLs unchanged", () => {
    const rawUrl =
      "https://tiles.globalforestwatch.org/some_raster/{z}/{x}/{y}.png";
    const dataset: DatasetInfo = {
      ...BASE_DATASET,
      context_layer: "some_raster",
      context_layers: [{ name: "some_raster", tile_url: rawUrl }],
    };

    const result = getDatasetLayerContextProps(dataset);

    expect(result.contextLayer).toBeDefined();
    expect(result.contextLayer!.tileUrl).toBe(rawUrl);
    expect(result.contextLayer!.sourceLayer).toBeUndefined();
  });
});

describe("buildDatasetLayers", () => {
  it("builds a single main layer from tileUrl when layers is absent", () => {
    const layers = buildDatasetLayers({
      datasetId: 4,
      layerName: "Tree cover loss",
      tileUrl: "https://example.com/tiles/{z}/{x}/{y}.png",
    });

    expect(layers).toHaveLength(1);
    expect(layers[0].id).toBe("dataset-4");
    expect(layers[0].name).toBe("Tree cover loss");
  });

  it("renders only the first layer by default when multiple layers exist", () => {
    const layers = buildDatasetLayers({
      datasetId: 12,
      layers: [
        { name: "agriculture", tileUrl: "https://example.com/agriculture.png" },
        { name: "lulucf", tileUrl: "https://example.com/lulucf.png" },
      ],
    });

    expect(layers).toHaveLength(1);
    expect(layers[0]).toMatchObject({
      id: "dataset-12",
      name: "agriculture",
      datasetId: 12,
    });
    expect(layers[0].opacity).toBeUndefined();
  });

  it("renders only the requested `selectedLayerName` layer", () => {
    const layers = buildDatasetLayers({
      datasetId: 12,
      selectedLayerName: "lulucf",
      layers: [
        { name: "agriculture", tileUrl: "https://example.com/agriculture.png" },
        { name: "lulucf", tileUrl: "https://example.com/lulucf.png" },
      ],
    });

    expect(layers).toHaveLength(1);
    // Id keyed to the entry's declared index, so CatalogPanel's rows match.
    expect(layers[0]).toMatchObject({
      id: "dataset-12-lulucf",
      name: "lulucf",
      datasetId: 12,
    });
    expect(layers[0].opacity).toBeUndefined();
  });

  it("falls back to the first layer when `selectedLayerName` is unknown", () => {
    const layers = buildDatasetLayers({
      datasetId: 12,
      selectedLayerName: "nope",
      layers: [
        { name: "agriculture", tileUrl: "https://example.com/agriculture.png" },
        { name: "lulucf", tileUrl: "https://example.com/lulucf.png" },
      ],
    });

    expect(layers).toHaveLength(1);
    expect(layers[0].name).toBe("agriculture");
  });

  it("leaves opacity untouched for a single layer", () => {
    const layers = buildDatasetLayers({
      datasetId: 4,
      layerName: "Tree cover loss",
      tileUrl: "https://example.com/tiles/{z}/{x}/{y}.png",
    });

    expect(layers[0].opacity).toBeUndefined();
  });

  it("returns [] when there is nothing to render", () => {
    expect(buildDatasetLayers({ datasetId: 4 })).toEqual([]);
  });

  it("attaches a context sub-layer beneath the selected layer", () => {
    const layers = buildDatasetLayers({
      datasetId: 12,
      selectedLayerName: "lulucf",
      layers: [
        { name: "agriculture", tileUrl: "https://example.com/agriculture.png" },
        { name: "lulucf", tileUrl: "https://example.com/lulucf.png" },
      ],
      contextLayer: {
        name: "primary_forest",
        tileUrl: "https://example.com/primary_forest.png",
      },
    });

    expect(layers).toHaveLength(2);
    const ctx = layers[1];
    expect(ctx.parentLayerId).toBe("dataset-12-lulucf");
  });

  it("prefers a layer's own dates over the spec's dataset-level dates", () => {
    const spec = {
      datasetId: 12,
      startDate: "2016-01-01",
      endDate: "2024-12-31",
      layers: [
        { name: "agriculture", tileUrl: "https://example.com/agriculture.png" },
        {
          name: "lulucf",
          tileUrl: "https://example.com/lulucf.png",
          startDate: "2020-01-01",
          endDate: "2022-12-31",
        },
      ],
    };

    // Falls back to the dataset-level dates when the selected layer has none.
    expect(
      buildDatasetLayers({ ...spec, selectedLayerName: "agriculture" })[0]
    ).toMatchObject({
      startDate: "2016-01-01",
      endDate: "2024-12-31",
    });
    expect(
      buildDatasetLayers({ ...spec, selectedLayerName: "lulucf" })[0]
    ).toMatchObject({
      startDate: "2020-01-01",
      endDate: "2022-12-31",
    });
  });
});

describe("toLayerEntries", () => {
  it("converts wire-shaped layers to DatasetLayerEntry, carrying per-layer dates", () => {
    const entries = toLayerEntries([
      { name: "agriculture", tile_url: "https://example.com/agriculture.png" },
      {
        name: "lulucf",
        tile_url: "https://example.com/lulucf.png",
        start_date: "2020-01-01",
        end_date: "2022-12-31",
      },
    ]);

    expect(entries).toEqual([
      { name: "agriculture", tileUrl: "https://example.com/agriculture.png" },
      {
        name: "lulucf",
        tileUrl: "https://example.com/lulucf.png",
        startDate: "2020-01-01",
        endDate: "2022-12-31",
      },
    ]);
  });

  it("returns undefined when there are no layers", () => {
    expect(toLayerEntries(undefined)).toBeUndefined();
  });

  it("reorders backend layers to the dataset's canonical DATASET_CARDS order", () => {
    // LGMS (dataset_id 12) declares [lgms, lulucf, agriculture, cropland,
    // livestock] in DATASET_CARDS. A backend response listing them in a
    // different order must still resolve to that canonical order, or
    // buildDatasetLayers' index-keyed ids desync from CatalogPanel's.
    const entries = toLayerEntries(
      [
        {
          name: "agriculture",
          tile_url: "https://example.com/agriculture.png",
        },
        { name: "lulucf", tile_url: "https://example.com/lulucf.png" },
      ],
      12
    );

    expect(entries?.map((e) => e.name)).toEqual(["lulucf", "agriculture"]);
  });
});
