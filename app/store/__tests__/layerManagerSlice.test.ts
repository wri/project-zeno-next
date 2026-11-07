import { beforeEach, describe, expect, it } from "vitest";

import useMapStore from "@/app/store/mapStore";
import type { Layer } from "@/app/store/layerManagerSlice";

const areaLayer: Layer = {
  id: "area-BRA",
  name: "Brazil",
  type: "geojson",
  visible: true,
};

const primary: Layer = {
  id: "dataset-4",
  name: "Tree cover loss",
  type: "raster",
  visible: true,
  datasetId: 4,
};

const context: Layer = {
  id: "dataset-4-ctx-primary_forest",
  name: "primary_forest",
  type: "raster",
  visible: true,
  datasetId: 4,
  parentLayerId: "dataset-4",
};

describe("removeDatasetLayers", () => {
  beforeEach(() => {
    useMapStore.setState({ layers: [areaLayer, primary, context] });
  });

  it("removes every dataset layer, context sub-layers included, and keeps the others", () => {
    useMapStore.getState().removeDatasetLayers();

    expect(useMapStore.getState().layers).toEqual([areaLayer]);
  });
});
