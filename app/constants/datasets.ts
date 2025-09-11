import { DatasetInfo } from "@/app/types/chat";

// UI card config that may omit some DatasetInfo fields; we'll fill defaults
export type DatasetCardConfig = {
  dataset_id: number;
  dataset_name: string;
  description: string;
  img?: string;
  tile_url?: string;
  data_layer?: string;
  context_layer?: string | null;
  threshold?: number | null;
  legend?: {
    title: string;
    color: string;
    symbology: {
      items: {
        label: string;
        color: string;
      }[];
    };
    type: "simple" | "categorical" | "gradient";
    info: string;
    note: string;
  };
};

export const DATASET_CARDS: (DatasetCardConfig & { img?: string })[] = [
  {
    dataset_id: 0,
    dataset_name: "Global all ecosystem disturbance alerts (DIST-ALERT)",
    data_layer: "Global all ecosystem disturbance alerts (DIST-ALERT)",
    context_layer: null as string | null,
    img: "/dataset_card_dist_alerts.png",
    description:
      "This dataset provides near-real-time alerts of vegetation disturbance at 30-meter resolution from January 2023 to present.",
    tile_url:
      "https://tiles.globalforestwatch.org/umd_glad_dist_alerts/latest/dynamic/{z}/{x}/{y}.png?render_type=true_color",
    legend: {
      title: "Global all ecosystem disturbance alerts (DIST-ALERT)",
      color: "#f69",
      symbology: {
        items: [{ label: "Disturbance Alert", color: "#f69" }],
      },
      type: "simple",
      info: 'This dataset provides near-real-time alerts of vegetation disturbance at 30-meter resolution from January 2023 to present, which covers both 2023 and 2024 timeframes needed to compare alert frequencies. It\'s specifically designed to track disturbance events that would generate "alerts" as mentioned in the query.',
      note: "This is a placeholder note.",
    },
  },
  {
    dataset_id: 1,
    dataset_name: "Global land cover",
    context_layer: null as string | null,
    img: "/dataset_card_land_cover.png",
    description:
      "Global All Ecosystem Disturbance Alerts (DIST-ALERT) provides near-real-time alerts of vegetation disturbance globally at 30-meter resolution, using harmonized Landsat-Sentinel-2 imagery. A filtered subset of these daily alerts (Land Disturbance Alert Classification System or LDACS) can also be classified into potential drivers: conversion, cropland dynamics, fire-related, water-related, or unclassified.",
    tile_url: "",
    legend: {
      title: "Global land cover (2024)",
      color: "#8E3037",
      symbology: {
        items: [
          { label: "bare", color: "#FEFECC" },
          { label: "short vegetation", color: "#B9B91E" },
          { label: "forest", color: "#246E24" },
          { label: "wetland vegetation", color: "#74D6B4" },
          { label: "water", color: "#6BAED6" },
          { label: "ice", color: "#ACD1E8" },
          { label: "cropland", color: "#fff183" },
          { label: "built-up", color: "#e8765d" },
          { label: "cultivated grasslands", color: "#d95f02" },
        ],
      },
      type: "categorical",
      info: "This dataset includes built-up land as one of its land cover classes, which directly corresponds to urban areas. It provides global coverage with annual data from 2015-2024, making it the most appropriate dataset to answer questions about urban area extent worldwide.",
      note: "This is a placeholder note.",
    },
  },
  {
    dataset_id: 2,
    dataset_name: "Global natural/semi-natural grassland extent",
    context_layer: null as string | null,
    img: "/dataset_card_grasslands.png",
    description:
      "Annual 30 m maps of global natural/semi-natural grassland extent from 2000 to 2024. This dataset defines grasslands very broadly such that they encompass grasslands, shrublands, and savannas by including any land cover type which contains at least 30% of dry or wet low vegetation, dominated by grasses and forbs (less than 3 meters) and a: maximum of 50% tree canopy cover (greater than 5 meters), a maximum of 70% of other woody vegetation (scrubs and open shrubland), and a maximum of 50% active cropland cover in mosaic landscapes of cropland & other vegetation.",
    tile_url: "",
    legend: {
      title: "Global Grasslands (2024)",
      color: "#ff9916",
      symbology: {
        items: [{ label: "Natural/semi-natural grassland", color: "#ff9916" }],
      },
      type: "simple",
      info: "This dataset provides global coverage with annual data from 2015-2024, making it the most appropriate dataset to answer questions about grassland area extent worldwide.",
      note: "This is a placeholder note.",
    },
  },
  {
    dataset_id: 3,
    dataset_name: "SBTN Natural Lands Map",
    context_layer: null as string | null,
    img: "/dataset_card_natural_lands.png",
    description:
      "The SBTN Natural Lands Map v1.1 is a 2020 baseline map of natural and non-natural land covers intended for use by companies setting science-based targets for nature, specifically the SBTN Land target #1: no conversion of natural ecosystems. This map is global with 30m resolution and was made by compiling existing global and regional data including the GLAD Global Land Cover and Change data, ESA WorldCover, and many other land cover and use datasets.",
    tile_url: "",
    legend: {
      title: "SBTN Natural lands (2020)",
      color: "#A8DCB5",
      symbology: {
        items: [
          { label: "natural forests", color: "#246E24" },
          { label: "natural short vegetation", color: "#B9B91E" },
          { label: "natural water", color: "#6BAED6" },
          { label: "mangroves", color: "#06A285" },
          { label: "bare", color: "#FEFECC" },
          { label: "snow", color: "#ACD1E8" },
          { label: "wet natural forests", color: "#589558" },
          { label: "natural peat forests", color: "#093D09" },
          { label: "wet natural short vegetation", color: "#DBDB7B" },
          { label: "natural peat short vegetation", color: "#99991A" },
          { label: "crop", color: "#D3D3D3" },
          { label: "built", color: "#D3D3D3" },
          { label: "non-natural tree cover", color: "#D3D3D3" },
          { label: "non-natural short vegetation", color: "#D3D3D3" },
          { label: "non-natural water", color: "#D3D3D3" },
          { label: "wet non-natural tree cover", color: "#D3D3D3" },
          { label: "non-natural peat tree cover", color: "#D3D3D3" },
          { label: "wet non-natural short vegetation", color: "#D3D3D3" },
          { label: "non-natural peat short vegetation", color: "#D3D3D3" },
          { label: "non-natural bare", color: "#D3D3D3" },
        ],
      },
      type: "categorical",
      info: 'The Natural lands dataset is the best match because it provides a 2020 baseline map of natural vs non-natural land covers at 30m resolution, which can be used to identify intact/natural landscapes. This dataset specifically defines "natural" ecosystems as those that substantially resemble what would be found without major human impacts, making it ideal for assessing landscape intactness across Canadian provinces.',
      note: "This is a placeholder note.",
    },
  },
  {
    dataset_id: 4,
    dataset_name: "Tree cover loss",
    data_layer: "Tree cover loss",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_tree_cover_loss.png",
    description:
      "Tree Cover Loss (Hansen/UMD/GLAD) maps annual global forest loss from 2001 to 2024 at 30-meter resolution using Landsat satellite imagery. It detects stand-replacement disturbances in vegetation over 5 meters tall, including natural forests and plantations. The dataset supports monitoring annual tree cover loss and deforestation trends, fire impacts, and forestry practices, and is widely used for conservation, land-use planning, and environmental policy analysis.",
    tile_url:
      "https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png?start_year=2001&end_year=2024&tree_cover_density_threshold=25&render_type=true_color",
    legend: {
      title: "Tree cover loss (2001-2024)",
      color: "#f69",
      symbology: {
        items: [{ label: "Tree cover loss", color: "#f69" }],
      },
      type: "simple",
      info: "Tree cover loss dataset can detect stand-replacement disturbances including plantations and supports monitoring forestry practices. The driver context layer would help distinguish harvesting from other causes of tree loss, making it ideal for tracking plantation harvesting cycles.",
      note: "This is a placeholder note.",
    },
  },
  {
    dataset_id: 5,
    dataset_name: "Tree cover gain",
    data_layer: "Tree cover gain",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_tree_cover_gain.png",
    description:
      "Tree Cover Gain (Hansen/UMD/GLAD) identifies areas where new tree canopy was established between 2000 and 2012 at 30-meter resolution, using Landsat 7 imagery. It captures both  natural forest regrowth and tree plantation cycles, and is useful for tracking large-scale forest recovery trends. Users should note that it is a cumulative layer and should not be combined directly with loss or tree cover data to calculate net change.",
    tile_url:
      "https://tiles.globalforestwatch.org/umd_tree_cover_gain_from_height/latest/default/{z}/{x}/{y}.png",
  },
  {
    dataset_id: 6,
    dataset_name: "Forest greenhouse gas net flux",
    data_layer: "Forest greenhouse gas net flux",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_net_flux.png",
    description:
      "Maps the balance between emissions from forest disturbances and carbon removals from forest growth between 2001 and 2024, using a globally consistent model. This dataset supports climate reporting, forest-based mitigation strategies, and greenhouse gas inventories by identifying where forests are contributing to or helping mitigate climate change.",
    tile_url:
      "https://tiles.globalforestwatch.org/gfw_forest_carbon_net_flux/latest/dynamic/{z}/{x}/{y}.png?tree_cover_density_threshold=30",
  },
  {
    dataset_id: 7,
    dataset_name: "Tree cover",
    data_layer: "Tree cover",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_tree_cover.png",
    description:
      "Tree Cover provides global percent tree canopy cover at 30-meter resolution for years 2000, based on Landsat 7 imagery. It represents the density of vegetation over 5 meters tall, including both natural forests and plantations. This dataset is useful for establishing historical baselines and comparing tree cover density across different landscapes.",
    tile_url:
      "https://tiles.globalforestwatch.org/umd_tree_cover_density_{year}/latest/tcd_{threshold}/{z}/{x}/{y}.png",
  },
];

// Defaults applied to DatasetInfo when not provided by cards
const DEFAULT_DATASET_FIELDS: Omit<
  DatasetInfo,
  "dataset_id" | "dataset_name" | "description"
> = {
  source: "",
  data_layer: "",
  tile_url: "",
  context_layer: "",
  threshold: null,
  methodology: "",
  cautions: "",
  citation: "",
  reason: "", // for compatibility with LayerCardItem
};

export const DATASETS: DatasetInfo[] = DATASET_CARDS.map(
  ({
    dataset_id,
    dataset_name,
    context_layer,
    description,
    tile_url,
    data_layer,
    threshold,
  }) => ({
    ...DEFAULT_DATASET_FIELDS,
    dataset_id,
    dataset_name,
    description,
    reason: description, // for compatibility with LayerCardItem
    data_layer: (data_layer ?? DEFAULT_DATASET_FIELDS.data_layer) as string,
    tile_url: (tile_url ?? DEFAULT_DATASET_FIELDS.tile_url) as string,
    context_layer: (context_layer ?? DEFAULT_DATASET_FIELDS.context_layer) as
      | string
      | null,
    threshold: (threshold ?? DEFAULT_DATASET_FIELDS.threshold) as number | null,
  })
);

export const DATASET_BY_ID: Record<number, DatasetInfo> = Object.fromEntries(
  DATASETS.map((d) => [d.dataset_id, d])
);
