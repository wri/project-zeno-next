/**
 * Boundary layers: global vector-tile collections of candidate areas (admin
 * units, KBAs, protected areas, indigenous lands). One can be shown at a time
 * (`mapStore.selectAreaLayer`); clicking a feature on it picks that feature as
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
    url: "https://tiles.globalforestwatch.org/wdpa_protected_areas/latest/default/{z}/{x}/{y}.pbf",
    sourceLayer: "wdpa_protected_areas",
    nameKeys: ["name"],
    source: "World Database on Protected Areas",
  },
  {
    id: "LandMark",
    name: "Indigenous Lands",
    url: "https://tiles.globalforestwatch.org/landmark_indigenous_and_community_lands/latest/default/{z}/{x}/{y}.pbf",
    sourceLayer: "landmark_indigenous_and_community_lands",
    nameKeys: ["name"],
    source: "LandMark · Indigenous & community lands",
  },
] as const);

export type LayerId = (typeof selectLayerOptions)[number]["id"];
export type LayerName = (typeof selectLayerOptions)[number]["name"];
