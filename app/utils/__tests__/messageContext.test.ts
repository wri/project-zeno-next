import { describe, expect, it } from "vitest";

import { DATASET_BY_ID } from "@/app/constants/datasets";
import type { GeoJsonEntry, Layer } from "@/app/store/layerManagerSlice";
import {
  deriveContext,
  diffUiContext,
  emptyContextKeys,
} from "@/app/utils/messageContext";

const datasetId = Number(Object.keys(DATASET_BY_ID)[0]);

const aiAreaLayer: Layer = {
  id: "area-ai",
  name: "Pará, Brazil",
  type: "geojson",
  visible: true,
  featureRefs: [{ name: "Pará, Brazil", source: "gadm" }],
  aoiSelection: {
    name: "Pará, Brazil",
    aois: [
      {
        name: "Pará, Brazil",
        src_id: "BRA.14_1",
        source: "gadm",
        subtype: "state-province",
      },
    ],
  },
};

const manualGadmLayer: Layer = {
  id: "area-manual",
  name: "Lebanon",
  type: "geojson",
  visible: true,
  featureRefs: [{ name: "Lebanon", source: "GADM" }],
};

const manualGadmRegistry: GeoJsonEntry[] = [
  {
    ref: { name: "Lebanon", source: "GADM" },
    data: { type: "FeatureCollection", features: [] },
    srcId: "LBN",
    subtype: "country",
  },
];

const datasetMainLayer: Layer = {
  id: "ds-main",
  name: "Tree cover loss",
  type: "raster",
  visible: true,
  datasetId,
};

describe("deriveContext", () => {
  it("reads aoi_selected straight from an AI/global layer's aoiSelection", () => {
    const { uiContext, keys, snapshot } = deriveContext(
      [aiAreaLayer],
      [],
      null
    );

    expect(uiContext.aoi_selected).toEqual({
      aoi: {
        name: "Pará, Brazil",
        gadm_id: undefined,
        src_id: "BRA.14_1",
        subtype: "state-province",
        source: "gadm",
      },
      aoi_name: "Pará, Brazil",
      subtype: "state-province",
    });
    expect(keys.aoi).toBe("Pará, Brazil");
    expect(snapshot.areas).toEqual(["Pará, Brazil"]);
  });

  it("reconstructs a manual GADM area from the registry (gadm_id + lowercased source)", () => {
    const { uiContext } = deriveContext(
      [manualGadmLayer],
      manualGadmRegistry,
      null
    );

    expect(uiContext.aoi_selected).toEqual({
      aoi: {
        name: "Lebanon",
        gadm_id: "LBN",
        src_id: "LBN",
        subtype: "country",
        source: "gadm",
      },
      aoi_name: "Lebanon",
      subtype: "country",
    });
  });

  it("derives dataset_selected and a daterange from a dataset layer + date range", () => {
    const dateRange = {
      start: new Date(2020, 0, 1),
      end: new Date(2023, 11, 31),
    };
    const { uiContext, keys, snapshot } = deriveContext(
      [datasetMainLayer],
      [],
      dateRange
    );

    expect(uiContext.dataset_selected).toEqual({
      dataset: DATASET_BY_ID[datasetId],
    });
    expect(keys.dataset).toBe(datasetId);
    expect(uiContext.daterange_selected).toEqual({
      start_date: "2020-01-01",
      end_date: "2023-12-31",
    });
    expect(keys.daterange).toBe("2020-01-01|2023-12-31");
    expect(snapshot.datasets).toEqual(["Tree cover loss"]);
    expect(snapshot.daterange).toEqual({
      start_date: "2020-01-01",
      end_date: "2023-12-31",
    });
  });

  it("ignores hidden area layers and context sub-layers", () => {
    const hiddenArea: Layer = { ...aiAreaLayer, id: "hidden", visible: false };
    const subLayer: Layer = {
      id: "ds-sub",
      name: "context",
      type: "vector",
      visible: true,
      datasetId,
      parentLayerId: "ds-main",
    };
    const { uiContext, snapshot } = deriveContext(
      [hiddenArea, subLayer],
      [],
      null
    );

    expect(uiContext.aoi_selected).toBeUndefined();
    expect(uiContext.dataset_selected).toBeUndefined();
    expect(snapshot.areas).toBeUndefined();
  });
});

describe("diffUiContext", () => {
  it("sends every present slot when nothing was sent before", () => {
    const { uiContext, keys } = deriveContext(
      [aiAreaLayer, datasetMainLayer],
      [],
      null
    );
    const ui = diffUiContext(uiContext, keys, emptyContextKeys());

    expect(ui.aoi_selected).toBeDefined();
    expect(ui.dataset_selected).toBeDefined();
  });

  it("drops slots that are unchanged since the last send", () => {
    const { uiContext, keys } = deriveContext(
      [aiAreaLayer, datasetMainLayer],
      [],
      null
    );
    // Same context already sent → nothing new to announce.
    const ui = diffUiContext(uiContext, keys, keys);

    expect(ui).toEqual({});
  });

  it("re-sends only the slot whose identity changed", () => {
    const { uiContext, keys } = deriveContext(
      [aiAreaLayer, datasetMainLayer],
      [],
      null
    );
    // The dataset was sent before, but a different area is now active.
    const last = { ...keys, aoi: "Somewhere else" };
    const ui = diffUiContext(uiContext, keys, last);

    expect(ui.aoi_selected).toBeDefined();
    expect(ui.dataset_selected).toBeUndefined();
  });
});
