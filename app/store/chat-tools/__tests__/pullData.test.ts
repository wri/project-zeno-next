import { beforeEach, describe, expect, it } from "vitest";

import useMapStore from "@/app/store/mapStore";
import type { Layer } from "@/app/store/layerManagerSlice";
import type { DatasetInfo, StreamMessage } from "@/app/types/chat";
import { pullDataTool } from "../pullData";

const ALERTS_TILES =
  "https://tiles.example.test/alerts/{z}/{x}/{y}.png?render_type=true_color";

// The layer pick_dataset added on an earlier turn, for the whole record.
const alertsLayer: Layer = {
  id: "dataset-11",
  name: "Integrated alerts",
  type: "raster",
  visible: false,
  opacity: 0.5,
  tileUrl: `${ALERTS_TILES}&start_date=2023-12-01&end_date=2026-11-06`,
  datasetId: 11,
  startDate: "2023-12-01",
  endDate: "2026-11-06",
};

const areaLayer: Layer = {
  id: "area-BRA",
  name: "Brazil",
  type: "geojson",
  visible: true,
};

// The dataset pull_data returns after it analysed March 2025.
const retiled: DatasetInfo = {
  dataset_id: 11,
  dataset_name: "Integrated alerts",
  tile_url: `${ALERTS_TILES}&start_date=2025-03-01&end_date=2025-03-31`,
  layers: [
    {
      name: "Integrated alerts",
      tile_url: `${ALERTS_TILES}&start_date=2025-03-01&end_date=2025-03-31`,
    },
  ],
  context_layer: null,
  context_layers: [],
  start_date: "2025-03-01",
  end_date: "2025-03-31",
};

const pullData = (dataset?: DatasetInfo): StreamMessage => ({
  type: "tool",
  name: "pull_data",
  timestamp: new Date().toISOString(),
  dataset,
});

describe("pullDataTool", () => {
  beforeEach(() => {
    useMapStore.setState({ layers: [alertsLayer, areaLayer] });
  });

  it("moves the dataset layer's tiles and dates to the analysed range", () => {
    pullDataTool(pullData(retiled));

    const [alerts, area] = useMapStore.getState().layers;
    expect(alerts).toEqual({
      ...alertsLayer,
      tileUrl: retiled.layers![0].tile_url,
      startDate: "2025-03-01",
      endDate: "2025-03-31",
    });
    expect(area).toBe(areaLayer);
  });

  it("does not add the layer back when the user removed it", () => {
    useMapStore.setState({ layers: [areaLayer] });

    pullDataTool(pullData(retiled));

    expect(useMapStore.getState().layers).toEqual([areaLayer]);
  });

  it("leaves the map alone when the date range did not change", () => {
    // pull_data sends no dataset when it analysed the range on the map.
    pullDataTool(pullData());

    expect(useMapStore.getState().layers).toEqual([alertsLayer, areaLayer]);
  });
});
