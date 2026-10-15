/**
 * Boundary layers: global vector-tile collections of candidate areas (admin
 * units, KBAs, protected areas, indigenous lands, commodity concessions). One
 * can be shown at a time (`mapStore.selectAreaLayer`); clicking a feature on it picks that feature as
 * an area. Showing a boundary layer is NOT an area selection and never enters
 * `ui_context` — only the picked feature does.
 */
export const selectLayerOptions = Object.freeze([
  {
    id: "GADM",
    name: "Administrative Areas",
    url: "https://tiles.globalforestwatch.org/gadm_administrative_boundaries/v4.1.85/default/{z}/{x}/{y}.pbf",
    sourceLayer: "gadm_administrative_boundaries",
    nameKeys: ["name_0", "name_1", "name_2"],
    source: "GADM · countries, states & districts",
  },
  {
    id: "KBA",
    name: "Key Biodiversity Areas",
    url: "https://tiles.globalforestwatch.org/birdlife_key_biodiversity_areas/latest/default/{z}/{x}/{y}.pbf",
    sourceLayer: "birdlife_key_biodiversity_areas",
    nameKeys: ["intname"],
    source: "BirdLife International",
  },
  {
    id: "WDPA",
    name: "Protected Areas",
    // Pinned to the release the backend ingests (project-zeno
    // `ingest_wdpa.py`), so a clicked feature's `wdpa_pid` is an id
    // /api/analyze and /api/dashboards know. Later releases renamed it
    // `site_pid`. Bump together with the backend ingest.
    url: "https://tiles.globalforestwatch.org/wdpa_protected_areas/v202407/default/{z}/{x}/{y}.pbf",
    sourceLayer: "wdpa_protected_areas",
    nameKeys: ["name"],
    source: "World Database on Protected Areas",
  },
  {
    id: "LandMark",
    name: "Indigenous Lands",
    // The dataset and release the backend ingests (project-zeno
    // `ingest_landmark.py`): unlike `landmark_indigenous_and_community_lands`
    // its features carry `landmark_id`, the id the backend addresses them by.
    // Bump together with the backend ingest.
    url: "https://tiles.globalforestwatch.org/landmark_ip_lc_and_indicative_poly/v20250625/default/{z}/{x}/{y}.pbf",
    sourceLayer: "landmark_ip_lc_and_indicative_poly",
    nameKeys: ["name"],
    source: "LandMark · Indigenous & community lands",
  },
  // GFW concessions (project-zeno `ingest_concessions.py`). Each id
  // lowercases to the backend source key (`OIL_PALM` -> `oil_palm`), which
  // /api/metadata maps to `gfw_fid`: the backend stores every concession
  // under its tile `gfw_fid`, so a clicked feature resolves by id. Pinned to
  // the v2025 release the backend ingests; bump together with it. The tile
  // cache stops at z10 (z9 for the fill-only layers), so `maxzoom` lets the
  // map overzoom instead of requesting missing tiles.
  {
    id: "LOGGING",
    name: "Logging Concessions",
    url: "https://tiles.globalforestwatch.org/gfw_managed_forests/v2025/default/{z}/{x}/{y}.pbf",
    sourceLayer: "gfw_managed_forests",
    nameKeys: ["company", "conc_name"],
    source: "GFW · Logging concessions",
  },
  {
    id: "MINING",
    name: "Mining Concessions",
    url: "https://tiles.globalforestwatch.org/gfw_mining_concessions/v2025/default/{z}/{x}/{y}.pbf",
    sourceLayer: "gfw_mining_concessions",
    nameKeys: ["company", "conc_name"],
    source: "GFW · Mining concessions",
  },
  {
    id: "OIL_PALM",
    name: "Oil Palm Concessions",
    url: "https://tiles.globalforestwatch.org/gfw_oil_palm/v2025/default/{z}/{x}/{y}.pbf",
    sourceLayer: "gfw_oil_palm",
    nameKeys: ["company", "conc_name"],
    source: "GFW · Oil palm concessions",
  },
  {
    id: "RSPO_OIL_PALM",
    name: "RSPO Oil Palm Concessions",
    url: "https://tiles.globalforestwatch.org/rspo_oil_palm/v2025/default/{z}/{x}/{y}.pbf",
    sourceLayer: "rspo_oil_palm",
    // No conc_name in this dataset, and the group often repeats the
    // company; getFeatureName falls back to the group.
    nameKeys: ["company"],
    source: "RSPO · Certified oil palm concessions",
  },
  {
    id: "WOOD_FIBER",
    name: "Wood Fiber Concessions",
    url: "https://tiles.globalforestwatch.org/gfw_wood_fiber/v2025/default/{z}/{x}/{y}.pbf",
    sourceLayer: "gfw_wood_fiber",
    nameKeys: ["company", "conc_name"],
    source: "GFW · Wood fiber concessions",
  },
] as const);

export type LayerId = (typeof selectLayerOptions)[number]["id"];
export type LayerName = (typeof selectLayerOptions)[number]["name"];

/**
 * Map style of a concession boundary layer, after the GNW concessions map:
 * a translucent fill in the commodity's colour, an outline where GNW draws
 * one (oil palm and wood fiber are fill only), and the colour of the picked
 * feature's outline. The same colour is the layer's swatch in the list.
 */
export interface ConcessionStyle {
  fillColor: string;
  lineColor: string | null;
  lineWidth: number;
  selectColor: string;
  maxzoom: number;
  /** Name of a feature with no name, company or group. */
  unnamed: string;
}

export const CONCESSION_STYLES: Partial<Record<LayerId, ConcessionStyle>> =
  Object.freeze({
    LOGGING: {
      fillColor: "#fecc5c",
      lineColor: "#dea035",
      lineWidth: 0.5,
      selectColor: "#dea035",
      maxzoom: 10,
      unnamed: "Logging concession",
    },
    MINING: {
      fillColor: "#fbb685",
      lineColor: "#fbb685",
      lineWidth: 1,
      selectColor: "#e8873f",
      maxzoom: 10,
      unnamed: "Mining concession",
    },
    OIL_PALM: {
      fillColor: "#ee9587",
      lineColor: null,
      lineWidth: 0,
      selectColor: "#ee9587",
      maxzoom: 9,
      unnamed: "Oil palm concession",
    },
    RSPO_OIL_PALM: {
      fillColor: "#ff6361",
      lineColor: "#ff6361",
      lineWidth: 1,
      selectColor: "#ff6361",
      maxzoom: 10,
      unnamed: "RSPO oil palm concession",
    },
    WOOD_FIBER: {
      fillColor: "#8A2F1D",
      lineColor: null,
      lineWidth: 0,
      selectColor: "#c9573f",
      maxzoom: 9,
      unnamed: "Wood fiber concession",
    },
  });

/** Opacity of a concession fill, as on the GNW concessions map. */
export const CONCESSION_FILL_OPACITY = 0.7;
