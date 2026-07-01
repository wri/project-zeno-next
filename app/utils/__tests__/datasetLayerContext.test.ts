import { describe, it, expect } from "vitest";
import { getDatasetLayerContextProps } from "../datasetLayerContext";
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
