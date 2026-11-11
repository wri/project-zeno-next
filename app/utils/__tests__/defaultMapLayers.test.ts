import { beforeEach, describe, expect, it, vi } from "vitest";

// layerManagerSlice lazily imports chatStore to fold layer changes into the
// sent context; stub it so that import can't outlive the test environment.
vi.mock("@/app/store/chatStore", () => ({
  default: { getState: () => ({ includeLayerInContext: () => {} }) },
}));

import { TREE_COVER_LOSS_DATASET_ID } from "@/app/constants/datasets";
import useMapStore from "@/app/store/mapStore";
import {
  getDefaultDatasetId,
  seedDefaultDatasetLayer,
} from "../defaultMapLayers";

const datasetIds = () =>
  useMapStore
    .getState()
    .layers.map((l) => l.datasetId)
    .filter((id) => typeof id === "number");

describe("default map layers", () => {
  beforeEach(() => {
    useMapStore.setState({ layers: [] });
  });

  it("opens on tree cover loss, or LGMS net flux under ff=net-flux", () => {
    expect(getDefaultDatasetId(false)).toBe(TREE_COVER_LOSS_DATASET_ID);
    expect(getDefaultDatasetId(true)).toBe(12);
  });

  it("seeds the default dataset on an empty map", () => {
    seedDefaultDatasetLayer(TREE_COVER_LOSS_DATASET_ID);
    expect(datasetIds()).toContain(TREE_COVER_LOSS_DATASET_ID);
  });

  it("leaves a map that already shows a dataset alone", () => {
    useMapStore.setState({
      layers: [
        {
          id: "dataset-99",
          name: "Other",
          type: "raster",
          visible: true,
          datasetId: 99,
        },
      ],
    });
    seedDefaultDatasetLayer(TREE_COVER_LOSS_DATASET_ID);
    expect(datasetIds()).toEqual([99]);
  });
});
