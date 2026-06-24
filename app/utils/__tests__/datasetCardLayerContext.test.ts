import { describe, expect, it } from "vitest";
import type { DatasetCardConfig } from "@/app/constants/datasets";
import { getLayerContextFromDatasetCard } from "../datasetCardLayerContext";

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
