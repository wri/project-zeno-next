import { describe, it, expect, beforeEach, vi } from "vitest";

const addLayer = vi.fn();
const removeLayer = vi.fn();
let layers: Array<{ id: string; datasetId?: number }> = [];

vi.mock("@/app/store/mapStore", () => ({
  default: {
    getState: () => ({ addLayer, removeLayer, layers }),
  },
}));

vi.mock("@/app/constants/datasets", () => ({
  DATASET_BY_ID: {
    4: {
      dataset_id: 4,
      dataset_name: "Tree cover loss",
      tile_url: "https://example.com/tcl/{z}/{x}/{y}.png",
      context_layer: null,
      threshold: 30,
    },
  },
}));

vi.mock("@/app/utils/datasetLayerContext", () => ({
  getDatasetLayerContextProps: vi.fn(() => ({
    contextLayer: undefined,
    parameters: { canopy_cover: 30 },
    startDate: "2001-01-01",
    endDate: "2025-12-31",
  })),
  buildDatasetLayers: vi.fn(() => [
    { id: "dataset-4", datasetId: 4, name: "Tree cover loss" },
  ]),
}));

import {
  addSuggestedDatasetToMap,
  datasetChoiceEntry,
  isSuggestedDataset,
} from "../nudgeDataset";
import {
  getDatasetLayerContextProps,
  buildDatasetLayers,
} from "@/app/utils/datasetLayerContext";
import type { Nudge } from "@/app/types/chat";

const validEntry = {
  dataset_id: 4,
  dataset_name: "Tree cover loss",
  reason: "Historical annual tree cover loss.",
};

describe("isSuggestedDataset", () => {
  it("accepts a well-formed dataset entry", () => {
    expect(isSuggestedDataset(validEntry)).toBe(true);
  });

  it.each([
    [null],
    ["Tree cover loss"],
    [{ dataset_name: "Tree cover loss" }], // missing dataset_id
    [{ dataset_id: "4", dataset_name: "Tree cover loss" }], // wrong type
    [{ dataset_id: 4 }], // missing dataset_name
  ])("rejects malformed entry %j", (entry) => {
    expect(isSuggestedDataset(entry)).toBe(false);
  });
});

describe("datasetChoiceEntry", () => {
  const nudge: Nudge = {
    type: "dataset_choice",
    options: ["Tree cover loss", "Integrated alerts"],
    data: [validEntry, { bad: true }],
  };

  it("returns the aligned entry for a valid dataset_choice option", () => {
    expect(datasetChoiceEntry(nudge, 0)).toEqual(validEntry);
  });

  it("returns null for a malformed entry at that index", () => {
    expect(datasetChoiceEntry(nudge, 1)).toBeNull();
  });

  it("returns null when data is absent or shorter than options", () => {
    expect(
      datasetChoiceEntry({ type: "dataset_choice", options: ["A"] }, 0)
    ).toBeNull();
    expect(
      datasetChoiceEntry(
        { type: "dataset_choice", options: ["A", "B"], data: [validEntry] },
        1
      )
    ).toBeNull();
  });

  it("returns null for non-dataset_choice nudges even with data", () => {
    expect(
      datasetChoiceEntry(
        { type: "aoi_choice", options: ["A"], data: [validEntry] },
        0
      )
    ).toBeNull();
  });
});

describe("addSuggestedDatasetToMap", () => {
  beforeEach(() => {
    addLayer.mockClear();
    removeLayer.mockClear();
    vi.mocked(getDatasetLayerContextProps).mockClear();
    vi.mocked(buildDatasetLayers).mockClear();
    layers = [];
  });

  it("replaces existing dataset layers and adds the picked dataset's layers", () => {
    layers = [
      { id: "dataset-11", datasetId: 11 },
      { id: "area-1" }, // non-dataset layer must be kept
    ];

    addSuggestedDatasetToMap(validEntry);

    expect(removeLayer).toHaveBeenCalledTimes(1);
    expect(removeLayer).toHaveBeenCalledWith("dataset-11");
    expect(addLayer).toHaveBeenCalledTimes(1);
    expect(addLayer.mock.calls[0][0]).toMatchObject({ id: "dataset-4" });
  });

  it("merges the nudge entry's overrides onto the local dataset metadata", () => {
    addSuggestedDatasetToMap({
      ...validEntry,
      context_layer: "primary_forest",
      start_date: "2010-01-01",
      end_date: "2020-12-31",
      parameters: [{ name: "canopy_cover", values: [75] }],
    });

    expect(getDatasetLayerContextProps).toHaveBeenCalledWith(
      expect.objectContaining({
        dataset_id: 4,
        tile_url: "https://example.com/tcl/{z}/{x}/{y}.png",
        context_layer: "primary_forest",
        start_date: "2010-01-01",
        end_date: "2020-12-31",
        parameters: [{ name: "canopy_cover", values: [75] }],
      })
    );
    expect(buildDatasetLayers).toHaveBeenCalledWith(
      expect.objectContaining({
        datasetId: 4,
        layerName: "Tree cover loss",
        startDate: "2001-01-01",
        parameters: { canopy_cover: 30 },
      })
    );
  });

  it("keeps the local metadata when the entry has no overrides", () => {
    addSuggestedDatasetToMap(validEntry);

    expect(getDatasetLayerContextProps).toHaveBeenCalledWith(
      expect.objectContaining({ context_layer: null, threshold: 30 })
    );
  });

  it("no-ops for a dataset id with no local metadata", () => {
    addSuggestedDatasetToMap({ dataset_id: 999, dataset_name: "Unknown" });

    expect(removeLayer).not.toHaveBeenCalled();
    expect(addLayer).not.toHaveBeenCalled();
  });
});
