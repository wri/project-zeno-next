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
 * Map style and legend of a concession boundary layer, after the GNW
 * concessions map:
 * a translucent fill in the commodity's colour, an outline where GNW draws
 * one (oil palm and wood fiber are fill only), and the colour of the picked
 * feature's outline. The list card shows the layer's icon in its accent.
 * When the layer is on, the legend shows it as a layer (not an AREA pill):
 * its title, a swatch, and the countries the source covers.
 */
export interface ConcessionStyle {
  /** Legend title, in the legend's sentence case. */
  title: string;
  /** What the layer shows, for the legend's info popover. */
  info: string;
  /** The countries the source covers; the rest of the map is empty. */
  countries: readonly string[];
  fillColor: string;
  /** The outline, or null for the fill-only layers. */
  line: { color: string; width: number } | null;
  selectColor: string;
  /** The darker shade the GNW map uses for text and icons. */
  accent: string;
  maxzoom: number;
  /** Name of a feature with no name, company or group. */
  unnamed: string;
}

export const CONCESSION_STYLES: Partial<Record<LayerId, ConcessionStyle>> =
  Object.freeze({
    LOGGING: {
      title: "Logging concessions",
      info: "Areas where governments have granted rights to harvest timber, compiled by Global Forest Watch from national sources. Quality varies by source: a country's layer may be incomplete, and some boundaries may be out of date or inaccurate.",
      countries: [
        "Cambodia",
        "Cameroon",
        "Canada",
        "Central African Republic",
        "DR Congo",
        "Equatorial Guinea",
        "Gabon",
        "Indonesia",
        "Liberia",
        "Malaysia",
        "Peru",
        "Republic of Congo",
        "Suriname",
      ],
      fillColor: "#fecc5c",
      line: { color: "#dea035", width: 0.5 },
      selectColor: "#dea035",
      accent: "#C98208",
      maxzoom: 10,
      unnamed: "Logging concession",
    },
    MINING: {
      title: "Mining concessions",
      info: "Areas where governments have granted rights to explore for or extract minerals, compiled by Global Forest Watch from national sources. Quality varies by source: a country's layer may be incomplete, and some boundaries may be out of date or inaccurate.",
      countries: [
        "Brazil",
        "Cambodia",
        "Cameroon",
        "Canada",
        "Colombia",
        "DR Congo",
        "Gabon",
        "Indonesia",
        "Malaysia",
        "Mexico",
        "Peru",
        "Republic of Congo",
        "Suriname",
        "Zambia",
      ],
      fillColor: "#fbb685",
      line: { color: "#fbb685", width: 1 },
      selectColor: "#e8873f",
      accent: "#c4621f",
      maxzoom: 10,
      unnamed: "Mining concession",
    },
    OIL_PALM: {
      title: "Oil palm concessions",
      info: "Areas allocated for industrial oil palm plantations, compiled by Global Forest Watch from national sources. Quality varies by source: a country's layer may be incomplete, and some boundaries may be out of date or inaccurate.",
      countries: [
        "Cambodia",
        "Cameroon",
        "DR Congo",
        "Indonesia",
        "Liberia",
        "Malaysia",
        "Peru",
        "Republic of Congo",
      ],
      fillColor: "#ee9587",
      line: null,
      selectColor: "#ee9587",
      accent: "#c9604f",
      maxzoom: 9,
      unnamed: "Oil palm concession",
    },
    RSPO_OIL_PALM: {
      title: "RSPO oil palm concessions",
      info: "Oil palm concessions of members of the Roundtable on Sustainable Palm Oil (RSPO), from data the RSPO publishes, compiled by Global Forest Watch. Quality varies by source: a country's layer may be incomplete, and some boundaries may be out of date or inaccurate.",
      countries: [
        "Brazil",
        "Cambodia",
        "Cameroon",
        "Colombia",
        "Costa Rica",
        "Côte d'Ivoire",
        "DR Congo",
        "Dominican Republic",
        "Ecuador",
        "Gabon",
        "Ghana",
        "Guatemala",
        "Honduras",
        "Liberia",
        "Madagascar",
        "Malaysia",
        "Mexico",
        "Nicaragua",
        "Nigeria",
        "Panama",
        "Papua New Guinea",
        "Peru",
        "Sierra Leone",
        "Solomon Islands",
        "Sri Lanka",
        "São Tomé and Príncipe",
        "Thailand",
      ],
      fillColor: "#ff6361",
      line: { color: "#ff6361", width: 1 },
      selectColor: "#ff6361",
      accent: "#d14340",
      maxzoom: 10,
      unnamed: "RSPO oil palm concession",
    },
    WOOD_FIBER: {
      title: "Wood fiber concessions",
      info: "Areas allocated for fast-growing tree plantations that supply pulp, paper and wood fiber, compiled by Global Forest Watch from national sources. Quality varies by source: a country's layer may be incomplete, and some boundaries may be out of date or inaccurate.",
      countries: ["Cambodia", "Indonesia", "Malaysia", "Republic of Congo"],
      fillColor: "#8A2F1D",
      line: null,
      selectColor: "#c9573f",
      accent: "#8A2F1D",
      maxzoom: 9,
      unnamed: "Wood fiber concession",
    },
  });

/** Opacity of a concession fill, as on the GNW concessions map. */
export const CONCESSION_FILL_OPACITY = 0.7;
