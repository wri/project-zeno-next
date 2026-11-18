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
    oil_palm: "gfw_fid",
    rspo_oil_palm: "gfw_fid",
    logging: "gfw_fid",
    mining: "gfw_fid",
    wood_fiber: "gfw_fid",
    custom: "id",
  },
  subregion_to_subtype_mapping: {
    kba: "key-biodiversity-area",
    wdpa: "protected-area",
    landmark: "indigenous-and-community-land",
    oil_palm: "oil-palm-concession",
    rspo_oil_palm: "rspo-oil-palm-concession",
    logging: "logging-concession",
    mining: "mining-concession",
    wood_fiber: "wood-fiber-concession",
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

  // GFW concession features, copied from the v2025 tiles pinned in
  // app/types/map.ts (decoded 2026-10-15). Each srcId is the String(gfw_fid)
  // the backend stores the concession under: project-zeno's build was
  // checked against 37,517 live tile features, every one found by this id.
  it.each([
    [
      "LOGGING",
      // 19,585 Canadian logging parcels have no name, company or group.
      { gfw_fid: 7692, iso3: "CAN" },
      {
        name: "Logging concession, CAN",
        source: "logging",
        srcId: "7692",
        subtype: "logging-concession",
      },
    ],
    [
      "MINING",
      { gfw_fid: 1, iso3: "COG", conc_name: "Sangha", company: "Congo Mining" },
      {
        name: "Sangha, Congo Mining",
        source: "mining",
        srcId: "1",
        subtype: "mining-concession",
      },
    ],
    [
      "OIL_PALM",
      {
        gfw_fid: 1,
        iso3: "LBR",
        company: "Sime Darby Plantation (Liberia) Inc.",
        comp_group: "Sime Darby Berhad",
      },
      {
        name: "Sime Darby Plantation (Liberia) Inc.",
        source: "oil_palm",
        srcId: "1",
        subtype: "oil-palm-concession",
      },
    ],
    [
      "RSPO_OIL_PALM",
      {
        gfw_fid: 4477,
        iso3: "MYS",
        company: "TDM Plantation Sdn Bhd",
        comp_group: "TDM Plantation Sdn Bhd",
        cont_id: "1-0095-11-000-00",
      },
      {
        name: "TDM Plantation Sdn Bhd",
        source: "rspo_oil_palm",
        srcId: "4477",
        subtype: "rspo-oil-palm-concession",
      },
    ],
    [
      "RSPO_OIL_PALM",
      // 7,769 RSPO parcels have a group but no company.
      { gfw_fid: 5, iso3: "PNG", comp_group: "SIPEF Group" },
      {
        name: "SIPEF Group",
        source: "rspo_oil_palm",
        srcId: "5",
        subtype: "rspo-oil-palm-concession",
      },
    ],
    [
      "WOOD_FIBER",
      { gfw_fid: 9, iso3: "IDN", conc_name: "PT DAYA TANI KALBAR" },
      {
        name: "PT DAYA TANI KALBAR",
        source: "wood_fiber",
        srcId: "9",
        subtype: "wood-fiber-concession",
      },
    ],
  ] as const)(
    "selects a %s concession by its gfw_fid",
    (layerId, props, want) => {
      publish(layerId, props);
      expectSelected(want);
    }
  );

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
