import { describe, expect, it } from "vitest";
import type { DatasetCardConfig } from "@/app/constants/datasets";
import {
  datasetCardLayers,
  getLayerContextFromDatasetCard,
} from "../datasetCardLayerContext";

describe("getLayerContextFromDatasetCard", () => {
  it("adds start/end year query params and dates when both defaults exist", () => {
    const card = {
      dataset_id: 4,
      dataset_name: "Tree cover loss",
      description: "",
      tile_url: "https://example.com/tiles?x=1",
      defaultStartYear: 2001,
      defaultEndYear: 2025,
    } as DatasetCardConfig;

    expect(getLayerContextFromDatasetCard(card)).toEqual({
      datasetId: 4,
      tileUrl: "https://example.com/tiles?x=1&start_year=2001&end_year=2025",
      layerName: "Tree cover loss",
      startDate: "2001-01-01",
      endDate: "2025-12-31",
    });
  });

  it("keeps tile url unchanged when the default year range is partial", () => {
    const card = {
      dataset_id: 7,
      dataset_name: "Tree cover",
      description: "",
      tile_url: "https://example.com/tiles?x=1",
      defaultStartYear: 2000,
    } as DatasetCardConfig;

    expect(getLayerContextFromDatasetCard(card)).toEqual({
      datasetId: 7,
      tileUrl: "https://example.com/tiles?x=1",
      layerName: "Tree cover",
    });
  });
});

describe("datasetCardLayers", () => {
  it("renders a card's declared `layers` even with no top-level tile_url", () => {
    // LGMS has no top-level tile_url — only `layers` — so the analytics-only
    // fallback (no tile URL at all) must not swallow it.
    const card = {
      dataset_id: 12,
      dataset_name: "LGMS",
      description: "",
      layers: [
        { name: "lgms", tile_url: "https://example.com/lgms.png" },
        { name: "lulucf", tile_url: "https://example.com/lulucf.png" },
      ],
    } as DatasetCardConfig;

    const layers = datasetCardLayers(card);

    expect(layers).toHaveLength(1);
    expect(layers[0]).toMatchObject({
      id: "dataset-12",
      name: "lgms",
      tileUrl: "https://example.com/lgms.png",
    });
  });
});
