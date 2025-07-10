export const selectLayerOptions = Object.freeze([
  {
    id: "GADM",
    name: "Administrative Areas",
    url: "https://tiles.globalforestwatch.org/gadm_administrative_boundaries/v4.1.85/default/{z}/{x}/{y}.pbf",
    sourceLayer: "gadm_administrative_boundaries"
  },
  {
    id: "KBA",
    name: "Key Biodiversity Areas",
    url: "https://tiles.globalforestwatch.org/birdlife_key_biodiversity_areas/latest/default/{z}/{x}/{y}.pbf",
    sourceLayer: "birdlife_key_biodiversity_areas"
  },
  {
    id: "WDPA",
    name: "Protected Areas",
    url: "https://tiles.globalforestwatch.org/wdpa_protected_areas/latest/default/{z}/{x}/{y}.pbf",
    sourceLayer: "wdpa_protected_areas"
  },
  {
    id: "LandMark",
    name: "Indigenous Lands",
    url: "https://tiles.globalforestwatch.org/landmark_indigenous_and_community_lands/latest/default/{z}/{x}/{y}.pbf",
    sourceLayer: "landmark_indigenous_and_community_lands"
  },
] as const);

export type LayerId = typeof selectLayerOptions[number]['id'];
