export const selectLayerOptions = Object.freeze([
  {
    id: "GADM",
    name: "Administrative Areas",
    url: "https://tiles.globalforestwatch.org/gadm_administrative_boundaries/v4.1.85/default/{z}/{x}/{y}.pbf",
    sourceLayer: "gadm_administrative_boundaries",
    nameKeys: ["name_0", "name_1", "name_2"],
  },
  {
    id: "KBA",
    name: "Key Biodiversity Areas",
    url: "https://tiles.globalforestwatch.org/birdlife_key_biodiversity_areas/latest/default/{z}/{x}/{y}.pbf",
    sourceLayer: "birdlife_key_biodiversity_areas",
    nameKeys: ["intname"],
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
  },
  {
    id: "Custom",
    name: "Custom Areas",
    url: "",
    sourceLayer: "",
    nameKeys: [],
  },
] as const);

export type LayerId = (typeof selectLayerOptions)[number]["id"];
export type LayerName = (typeof selectLayerOptions)[number]["name"];
