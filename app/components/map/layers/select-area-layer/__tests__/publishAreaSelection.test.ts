import { beforeEach, describe, expect, it } from "vitest";

import useMapStore from "@/app/store/mapStore";
import type { LayerId } from "@/app/types/map";
import { useSelectionStore } from "@/src/features/analysis";

import { publishAreaSelection } from "../publishAreaSelection";

// The shape /api/metadata serves (project-zeno geocoding_helpers).
const METADATA = {
  layer_id_mapping: {
    gadm: "gadm_id",
    kba: "sitrecid",
    wdpa: "wdpa_pid",
    landmark: "landmark_id",
    custom: "id",
  },
  subregion_to_subtype_mapping: {
    kba: "key-biodiversity-area",
    wdpa: "protected-area",
    landmark: "indigenous-and-community-land",
    custom: "custom-area",
  },
  gadm_subtype_mapping: { GID_0: "country" },
};

const PREVIOUS = {
  name: "Old",
  source: "gadm",
  srcId: "X",
  subtype: "country",
};

function publish(layerId: LayerId, featureProps: Record<string, unknown>) {
  publishAreaSelection({ layerId, featureProps, metadata: METADATA });
}

function expectSelected(expected: object | null) {
  expect(useMapStore.getState().analysisSelection).toEqual(expected);
  expect(useSelectionStore.getState().selection).toEqual(expected);
}

describe("publishAreaSelection", () => {
  beforeEach(() => {
    useMapStore.getState().clearAnalysis();
    useSelectionStore.getState().clear();
  });

  it("selects a GADM area", () => {
    publish("GADM", { adm_level: 0, gid_0: "BRA", name_0: "Brazil" });
    expectSelected({
      name: "Brazil",
      source: "gadm",
      srcId: "BRA",
      subtype: "country",
    });
  });

  // Property shapes below are copied from the pinned tile releases in
  // app/types/map.ts (decoded 2026-09-24).
  it.each([
    [
      "KBA",
      { sitrecid: 22255, intname: "Campinas e Várzeas do Rio Branco" },
      {
        name: "Campinas e Várzeas do Rio Branco",
        source: "kba",
        srcId: "22255",
        subtype: "key-biodiversity-area",
      },
    ],
    [
      "WDPA",
      { wdpa_pid: "10826", name: "Estação Ecológica De Niquiá" },
      {
        name: "Estação Ecológica De Niquiá",
        source: "wdpa",
        srcId: "10826",
        subtype: "protected-area",
      },
    ],
    [
      "LandMark",
      { landmark_id: "VEN56", name: "Ikabaru (Taurepan, Pemon)" },
      {
        name: "Ikabaru (Taurepan, Pemon)",
        source: "landmark",
        srcId: "VEN56",
        subtype: "indigenous-and-community-land",
      },
    ],
  ] as const)("selects a %s area by its backend id", (layerId, props, want) => {
    publish(layerId, props);
    expectSelected(want);
  });

  it("clears the selection for a feature without a backend id", () => {
    useSelectionStore.getState().select(PREVIOUS);
    useMapStore.getState().setAnalysis(PREVIOUS);

    // A `latest` WDPA tile: the id moved to `site_pid`.
    publish("WDPA", { site_pid: "33922", name: "Waimiri-Atroari" });

    expectSelected(null);
  });

  it("clears the selection without metadata", () => {
    useSelectionStore.getState().select(PREVIOUS);
    publishAreaSelection({
      layerId: "GADM",
      featureProps: { adm_level: 0, gid_0: "BRA" },
      metadata: null,
    });
    expectSelected(null);
  });
});
