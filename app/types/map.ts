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
    url: "https://tiles.globalforestwatch.org/wdpa_protected_areas/latest/default/{z}/{x}/{y}.pbf",
    sourceLayer: "wdpa_protected_areas",
    nameKeys: ["name"],
  },
  {
    id: "LandMark",
    name: "Indigenous Lands",
    url: "https://tiles.globalforestwatch.org/landmark_indigenous_and_community_lands/latest/default/{z}/{x}/{y}.pbf",
    sourceLayer: "landmark_indigenous_and_community_lands",
    nameKeys: ["name"],
  },
  {
    id: "Custom",
    name: "Custom Areas",
  },
] as const);

export type LayerId = (typeof selectLayerOptions)[number]["id"];
export type LayerName = (typeof selectLayerOptions)[number]["name"];
