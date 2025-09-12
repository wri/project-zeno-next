import { DatasetInfo } from "@/app/types/chat";

const EOAPI_HOST =
  process.env.NEXT_PUBLIC_EOAPI_HOST ||
  "https://eoapi.staging.globalnaturewatch.org";

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
    min?: number | null;
    max?: number | null;
    title: string;
    color: string;
    symbology?: {
      items?: {
        value: string;
        color: string;
      }[] | null;
    };
    type: "symbol" | "categorical" | "sequential" | "divergent";
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
        items: [{ value: "Disturbance Alert", color: "#f69" }],
      },
      type: "symbol",
      info: 'This dataset provides near-real-time alerts of vegetation disturbance at 30-meter resolution from January 2023 to present, which covers both 2023 and 2024 timeframes needed to compare alert frequencies. It\'s specifically designed to track disturbance events that would generate "alerts" as mentioned in the query.',
      note: "",
    },
  },
  {
    dataset_id: 1,
    dataset_name: "Global land cover",
    context_layer: null as string | null,
    img: "/dataset_card_land_cover.png",
    description:
      "This Global Land Cover dataset is a combination of two global datasets: the GLAD Land Cover and Land Use Change annual data and the Global Pasture Watch Grassland Class Collection 2 Cultivated Grasslands annual data. This combination is annual from 2015 through 2024. This dataset shows land covers and uses including: bare ground and sparsevegetation, short vegetation, tree cover, wetlands, water, snow/ice, cropland, cultivated grasslands, and built-up land.",
    tile_url: `${EOAPI_HOST}/raster/collections/global-land-cover-v-2/tiles/WebMercatorQuad/{z}/{x}/{y}.png?colormap=%7B%220%22%3A%20%5B139%2C%2069%2C%2019%2C%20255%5D%2C%20%221%22%3A%20%5B255%2C%20255%2C%200%2C%20255%5D%2C%20%222%22%3A%20%5B0%2C%20128%2C%200%2C%20255%5D%2C%20%223%22%3A%20%5B0%2C%20255%2C%20255%2C%20255%5D%2C%20%224%22%3A%20%5B0%2C%200%2C%20255%2C%20255%5D%2C%20%225%22%3A%20%5B255%2C%20255%2C%20255%2C%20255%5D%2C%20%226%22%3A%20%5B255%2C%200%2C%200%2C%20255%5D%2C%20%227%22%3A%20%5B128%2C%20128%2C%20128%2C%20255%5D%2C%20%228%22%3A%20%5B255%2C%20165%2C%200%2C%20255%5D%7D&assets=asset&expression=asset%2A%28asset%3C9%29%2A%28asset%3E%3D0%29&asset_as_band=True`,
    legend: {
      title: "Global land cover (2024)",
      color: "#8E3037",
      symbology: {
        items: [
          { value: "bare", color: "#FEFECC" },
          { value: "short vegetation", color: "#B9B91E" },
          { value: "forest", color: "#246E24" },
          { value: "wetland vegetation", color: "#74D6B4" },
          { value: "water", color: "#6BAED6" },
          { value: "ice", color: "#ACD1E8" },
          { value: "cropland", color: "#fff183" },
          { value: "built-up", color: "#e8765d" },
          { value: "cultivated grasslands", color: "#d95f02" },
        ],
      },
      type: "categorical",
      info: "This dataset includes built-up land as one of its land cover classes, which directly corresponds to urban areas. It provides global coverage with annual data from 2015-2024, making it the most appropriate dataset to answer questions about urban area extent worldwide.",
      note: "",
    },
  },
  {
    dataset_id: 2,
    dataset_name: "Global natural/semi-natural grassland extent",
    context_layer: null as string | null,
    img: "/dataset_card_grasslands.png",
    description:
      "Annual 30 m maps of global natural/semi-natural grassland extent from 2000 to 2024. This dataset defines grasslands very broadly such that they encompass grasslands, shrublands, and savannas by including any land cover type which contains at least 30% of dry or wet low vegetation, dominated by grasses and forbs (less than 3 meters) and a: maximum of 50% tree canopy cover (greater than 5 meters), a maximum of 70% of other woody vegetation (scrubs and open shrubland), and a maximum of 50% active cropland cover in mosaic landscapes of cropland & other vegetation.",
    tile_url: `${EOAPI_HOST}/raster/collections/grasslands-v-1-1/tiles/WebMercatorQuad/{z}/{x}/{y}.png?colormap=%7B%220%22%3A%20%5B0%2C%200%2C%200%2C%200%5D%2C%20%221%22%3A%20%5B0%2C%200%2C%200%2C%200%5D%2C%20%222%22%3A%20%5B255%2C%20153%2C%2022%2C%20255%5D%2C%20%223%22%3A%20%5B0%2C%200%2C%200%2C%200%5D%7D&assets=asset&expression=asset%2A%28asset%3C4%29%2A%28asset%3E%3D0%29&asset_as_band=True`,
    legend: {
      title: "Global Grasslands (2000-2024)",
      color: "#ff9916",
      symbology: {
        items: [{ value: "Natural/semi-natural grassland", color: "#ff9916" }],
      },
      type: "symbol",
      info: "This dataset provides global coverage with annual data from 2000-2024, making it the most appropriate dataset to answer questions about grassland area extent worldwide.",
      note: "",
    },
  },
  {
    dataset_id: 3,
    dataset_name: "SBTN Natural Lands Map",
    context_layer: null as string | null,
    img: "/dataset_card_natural_lands.png",
    description:
      "The SBTN Natural Lands Map v1.1 is a 2020 baseline map of natural and non-natural land covers intended for use by companies setting science-based targets for nature, specifically the SBTN Land target #1: no conversion of natural ecosystems. This map is global with 30m resolution and was made by compiling existing global and regional data including the GLAD Global Land Cover and Change data, ESA WorldCover, and many other land cover and use datasets.",
    tile_url: `${EOAPI_HOST}/raster/collections/natural-lands-v-1-1/tiles/WebMercatorQuad/{z}/{x}/{y}.png?colormap=%7B%222%22%3A%20%5B36%2C%20110%2C%2036%2C%20255%5D%2C%20%223%22%3A%20%5B185%2C%20185%2C%2030%2C%20255%5D%2C%20%224%22%3A%20%5B107%2C%20174%2C%20214%2C%20255%5D%2C%20%225%22%3A%20%5B6%2C%20162%2C%20133%2C%20255%5D%2C%20%226%22%3A%20%5B254%2C%20254%2C%20204%2C%20255%5D%2C%20%227%22%3A%20%5B172%2C%20209%2C%20232%2C%20255%5D%2C%20%228%22%3A%20%5B88%2C%20149%2C%2088%2C%20255%5D%2C%20%229%22%3A%20%5B9%2C%2061%2C%209%2C%20255%5D%2C%20%2210%22%3A%20%5B219%2C%20219%2C%20123%2C%20255%5D%2C%20%2211%22%3A%20%5B153%2C%20153%2C%2026%2C%20255%5D%2C%20%2212%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2213%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2214%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2215%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2216%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2217%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2218%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2219%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2220%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2221%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%7D&assets=asset&expression=asset%2A%28asset%3C22%29%2A%28asset%3E1%29&asset_as_band=True`,
    legend: {
      title: "SBTN Natural lands (2020)",
      color: "#A8DCB5",
      symbology: {
        items: [
          { value: "natural forests", color: "#246E24" },
          { value: "natural short vegetation", color: "#B9B91E" },
          { value: "natural water", color: "#6BAED6" },
          { value: "mangroves", color: "#06A285" },
          { value: "bare", color: "#FEFECC" },
          { value: "snow", color: "#ACD1E8" },
          { value: "wet natural forests", color: "#589558" },
          { value: "natural peat forests", color: "#093D09" },
          { value: "wet natural short vegetation", color: "#DBDB7B" },
          { value: "natural peat short vegetation", color: "#99991A" },
          { value: "crop", color: "#D3D3D3" },
          { value: "built", color: "#D3D3D3" },
          { value: "non-natural tree cover", color: "#D3D3D3" },
          { value: "non-natural short vegetation", color: "#D3D3D3" },
          { value: "non-natural water", color: "#D3D3D3" },
          { value: "wet non-natural tree cover", color: "#D3D3D3" },
          { value: "non-natural peat tree cover", color: "#D3D3D3" },
          { value: "wet non-natural short vegetation", color: "#D3D3D3" },
          { value: "non-natural peat short vegetation", color: "#D3D3D3" },
          { value: "non-natural bare", color: "#D3D3D3" },
        ],
      },
      type: "categorical",
      info: 'The Natural lands dataset is the best match because it provides a 2020 baseline map of natural vs non-natural land covers at 30m resolution, which can be used to identify intact/natural landscapes. This dataset specifically defines "natural" ecosystems as those that substantially resemble what would be found without major human impacts, making it ideal for assessing landscape intactness across Canadian provinces.',
      note: "This map overestimates the extent of natural lands, and while remote sensing data, on which the map is based, can provide powerful insights, additional field work should be used for validation and to understand local dynamics. Caution should be used if calculating areas with the SBTN Natural Lands Map.",
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
      color: "#DC6C9A",
      symbology: {
        items: [{ value: "Tree cover loss", color: "#DC6C9A" }],
      },
      type: "symbol",
      info: "Tree cover loss dataset can detect stand-replacement disturbances including plantations and supports monitoring forestry practices. The driver context layer would help distinguish harvesting from other causes of tree loss, making it ideal for tracking plantation harvesting cycles.",
      note: "Tree cover canopy cover density is >30% by default",
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
    legend: {
      title: "Tree cover gain (2000-2020)",
      color: "#3F08F5",
      symbology: {
        items: [{ value: "Tree cover gain", color: "#3F08F5" }],
      },
      type: "symbol",
      info: "Tree cover gain dataset can detect natural forest regrowth and tree plantation cycles. It is useful for tracking large-scale forest recovery trends.",
      note: "",
    },
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
    legend: {
      title: "Tree cover (2000)",
      color: "#97BD3D",
      symbology: {
        items: [{ value: "Tree cover", color: "#97BD3D" }],
      },
      type: "symbol",
      info: "Tree cover gain dataset can detect natural forest regrowth and tree plantation cycles. It is useful for tracking large-scale forest recovery trends.",
      note: "Tree cover canopy cover density is >30% by default",
    },
  },
  {
    dataset_id: 6,
    dataset_name: "Forest greenhouse gas net flux (2001-2024)",
    data_layer: "Forest greenhouse gas net flux",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_net_flux.png",
    description:
      "Maps the balance between emissions from forest disturbances and carbon removals from forest growth between 2001 and 2024, using a globally consistent model. This dataset supports climate reporting, forest-based mitigation strategies, and greenhouse gas inventories by identifying where forests are contributing to or helping mitigate climate change.",
    tile_url:
      "https://tiles.globalforestwatch.org/gfw_forest_carbon_net_flux/latest/dynamic/{z}/{x}/{y}.png?tree_cover_density_threshold=30",
      legend: {
        title: "GHG net flux",
        type: "divergent",
        min: -1500,
        max: 1500,
        color: "#39082a",
        symbology: {
          items: [
            { value: "<-1500 (sink)", color: "#151d44" },
            { value: "", color: "#172447" },
            { value: "", color: "#182c4c" },
            { value: "", color: "#1a3350" },
            { value: "", color: "#1b3a54" },
            { value: "", color: "#1c4259" },
            { value: "", color: "#1c485d" },
            { value: "", color: "#1c4f62" },
            { value: "", color: "#1b5766" },
            { value: "", color: "#1a5d6a" },
            { value: "", color: "#18656e" },
            { value: "", color: "#156c72" },
            { value: "", color: "#137375" },
            { value: "", color: "#117a78" },
            { value: "", color: "#12827b" },
            { value: "", color: "#17887d" },
            { value: "", color: "#25917f" },
            { value: "", color: "#349880" },
            { value: "", color: "#419d82" },
            { value: "", color: "#52a384" },
            { value: "", color: "#61a987" },
            { value: "", color: "#6fad8b" },
            { value: "", color: "#7db390" },
            { value: "", color: "#8bb896" },
            { value: "", color: "#97bd9c" },
            { value: "", color: "#a4c3a3" },
            { value: "", color: "#b1c8ac" },
            { value: "", color: "#bcceb4" },
            { value: "", color: "#c8d4be" },
            { value: "", color: "#d3dac8" },
            { value: "", color: "#dde0d1" },
            { value: "", color: "#e9e7dd" },
            { value: "", color: "#ece4ec" },
            { value: "", color: "#e3dce7" },
            { value: "", color: "#dcd4e5" },
            { value: "", color: "#d3cce3" },
            { value: "", color: "#ccc3e3" },
            { value: "", color: "#c5bbe4" },
            { value: "", color: "#beb2e6" },
            { value: "", color: "#b9a8e8" },
            { value: "", color: "#b4a0e8" },
            { value: "", color: "#b097e7" },
            { value: "", color: "#ac8de4" },
            { value: "", color: "#a885e0" },
            { value: "", color: "#a57dd9" },
            { value: "", color: "#a174d2" },
            { value: "", color: "#9e6dca" },
            { value: "", color: "#9a65c0" },
            { value: "", color: "#945cb4" },
            { value: "", color: "#9056ab" },
            { value: "", color: "#8c4fa0" },
            { value: "", color: "#864896" },
            { value: "", color: "#82438c" },
            { value: "", color: "#7c3d82" },
            { value: "", color: "#763777" },
            { value: "", color: "#70326e" },
            { value: "", color: "#6a2d64" },
            { value: "", color: "#63275a" },
            { value: "", color: "#5c2352" },
            { value: "", color: "#551e48" },
            { value: "", color: "#4e1940" },
            { value: "", color: "#471438" },
            { value: "", color: "#3f0e31" },
            { value: ">1500 tCO2e/ha (source)", color: "#39082a" },
        ],
      },
      info: "This dataset maps the balance between emissions from forest disturbances and carbon removals from forest growth, making it ideal for identifying where forests are contributing to or helping mitigate climate change.",
      note: "Tree cover canopy cover density is >30% by default",
    },
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
