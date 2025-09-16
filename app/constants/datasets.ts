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
    title: string;
    color: string;
    items?: {
      color: string;
      label?: string | "";
    }[];
    type: "symbol" | "categorical" | "sequential" | "divergent";
    info: string;
    note: string;
    unit?: string | null;
  };
};

export const DATASET_CARDS: (DatasetCardConfig & { img?: string })[] = [
  {
    dataset_id: 0,
    dataset_name: "Global all ecosystem disturbance alerts (DIST-ALERT)",
    data_layer: "Global all ecosystem disturbance alerts (DIST-ALERT)",
    context_layer: null as string | null,
    img: "/dataset_card_dist_alerts.webp",
    description:
      "This dataset provides near-real-time alerts of vegetation disturbance at 30-meter resolution from January 2023 to present.",
    tile_url:
      "https://tiles.globalforestwatch.org/umd_glad_dist_alerts/latest/dynamic/{z}/{x}/{y}.png?render_type=true_color",
    legend: {
      title: "Global all ecosystem disturbance alerts",
      color: "#f69",
      items: [{ label: "DIST alert", color: "#f69" }],
      type: "symbol",
      info: 'This dataset provides near-real-time alerts of vegetation disturbance at 30-meter resolution from January 2023 to present, which covers both 2023 and 2024 timeframes needed to compare alert frequencies. It\'s specifically designed to track disturbance events that would generate "alerts" as mentioned in the query.',
      note: "Near-real-time vegetation disturbance alerts across all ecosystems, updated weekly (2023-present).",
    },
  },
  {
    dataset_id: 1,
    dataset_name: "Global land cover",
    context_layer: null as string | null,
    img: "/dataset_card_land_cover.webp",
    description:
      "This Global Land Cover dataset is a combination of two global datasets: the GLAD Land Cover and Land Use Change annual data and the Global Pasture Watch Grassland Class Collection 2 Cultivated Grasslands annual data. This combination is annual from 2015 through 2024. This dataset shows land covers and uses including: bare ground and sparsevegetation, short vegetation, tree cover, wetlands, water, snow/ice, cropland, cultivated grasslands, and built-up land.",
    tile_url: `${EOAPI_HOST}/raster/collections/global-land-cover-v-2/items/global-land-cover-2024/tiles/WebMercatorQuad/{z}/{x}/{y}.png?colormap=%7B%221%22%3A%20%5B139%2C%2069%2C%2019%2C%20255%5D%2C%20%222%22%3A%20%5B255%2C%20255%2C%200%2C%20255%5D%2C%20%223%22%3A%20%5B0%2C%20128%2C%200%2C%20255%5D%2C%20%224%22%3A%20%5B0%2C%20255%2C%20255%2C%20255%5D%2C%20%225%22%3A%20%5B0%2C%200%2C%20255%2C%20255%5D%2C%20%226%22%3A%20%5B255%2C%20255%2C%20255%2C%20255%5D%2C%20%227%22%3A%20%5B255%2C%200%2C%200%2C%20255%5D%2C%20%228%22%3A%20%5B128%2C%20128%2C%20128%2C%20255%5D%2C%20%229%22%3A%20%5B255%2C%20165%2C%200%2C%20255%5D%7D&assets=asset&expression=asset%2A%28asset%3C9%29%2A%28asset%3E%3D0%29&asset_as_band=True`,
    legend: {
      title: "Global land cover (2024)",
      color: "#8E3037",
      items: [
        { label: "bare", color: "#FEFECC" },
        { label: "short vegetation", color: "#B9B91E" },
        { label: "forest", color: "#246E24" },
        { label: "wetland vegetation", color: "#74D6B4" },
        { label: "water", color: "#6BAED6" },
        { label: "ice", color: "#ACD1E8" },
        { label: "cropland", color: "#fff183" },
        { label: "built-up", color: "#e8765d" },
        { label: "cultivated grasslands", color: "#FFCD73" },
      ],
      type: "categorical",
      info: "This dataset includes built-up land as one of its land cover classes, which directly corresponds to urban areas. It provides global coverage with annual data from 2015-2024, making it the most appropriate dataset to answer questions about urban area extent worldwide.",
      note: "Single-year global land cover snapshot for composition and baseline context.",
    },
  },
  {
    dataset_id: 2,
    dataset_name: "Global natural/semi-natural grassland extent",
    context_layer: null as string | null,
    img: "/dataset_card_grasslands.webp",
    description:
      "Annual 30 m maps of global natural/semi-natural grassland extent from 2000 to 2022. This dataset defines grasslands very broadly such that they encompass grasslands, shrublands, and savannas by including any land cover type which contains at least 30% of dry or wet low vegetation, dominated by grasses and forbs (less than 3 meters) and a: maximum of 50% tree canopy cover (greater than 5 meters), a maximum of 70% of other woody vegetation (scrubs and open shrubland), and a maximum of 50% active cropland cover in mosaic landscapes of cropland & other vegetation.",
    tile_url: `${EOAPI_HOST}/raster/collections/grasslands-v-1/tiles/WebMercatorQuad/{z}/{x}/{y}.png?colormap=%7B%220%22%3A%20%5B0%2C%200%2C%200%2C%200%5D%2C%20%221%22%3A%20%5B0%2C%200%2C%200%2C%200%5D%2C%20%222%22%3A%20%5B255%2C%20153%2C%2022%2C%20255%5D%2C%20%223%22%3A%20%5B0%2C%200%2C%200%2C%200%5D%7D&assets=asset&expression=asset%2A%28asset%3C4%29%2A%28asset%3E%3D0%29&asset_as_band=True`,
    legend: {
      title: "Global Grasslands (2000-2022)",
      color: "#ff9916",
      items: [
        { label: "Natural/semi-natural grassland", color: "#ff9916" },
      ],
      type: "symbol",
      info: "This dataset provides global coverage with annual data from 2000-2024, making it the most appropriate dataset to answer questions about grassland area extent worldwide.",
      note: "Annual maps of natural and semi-natural grasslands including savannas and shrublands.",
      unit: "ha",
    },
  },
  {
    dataset_id: 3,
    dataset_name: "SBTN Natural Lands Map",
    context_layer: null as string | null,
    img: "/dataset_card_natural_lands.webp",
    description:
      "The SBTN Natural Lands Map v1.1 is a 2020 baseline map of natural and non-natural land covers intended for use by companies setting science-based targets for nature, specifically the SBTN Land target #1: no conversion of natural ecosystems. This map is global with 30m resolution and was made by compiling existing global and regional data including the GLAD Global Land Cover and Change data, ESA WorldCover, and many other land cover and use datasets.",
    tile_url: `${EOAPI_HOST}/raster/collections/natural-lands-v-1-1/tiles/WebMercatorQuad/{z}/{x}/{y}.png?colormap=%7B%222%22%3A%20%5B36%2C%20110%2C%2036%2C%20255%5D%2C%20%223%22%3A%20%5B185%2C%20185%2C%2030%2C%20255%5D%2C%20%224%22%3A%20%5B107%2C%20174%2C%20214%2C%20255%5D%2C%20%225%22%3A%20%5B6%2C%20162%2C%20133%2C%20255%5D%2C%20%226%22%3A%20%5B254%2C%20254%2C%20204%2C%20255%5D%2C%20%227%22%3A%20%5B172%2C%20209%2C%20232%2C%20255%5D%2C%20%228%22%3A%20%5B88%2C%20149%2C%2088%2C%20255%5D%2C%20%229%22%3A%20%5B9%2C%2061%2C%209%2C%20255%5D%2C%20%2210%22%3A%20%5B219%2C%20219%2C%20123%2C%20255%5D%2C%20%2211%22%3A%20%5B153%2C%20153%2C%2026%2C%20255%5D%2C%20%2212%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2213%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2214%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2215%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2216%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2217%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2218%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2219%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2220%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2221%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%7D&assets=asset&expression=asset%2A%28asset%3C22%29%2A%28asset%3E1%29&asset_as_band=True`,
    legend: {
      title: "SBTN Natural lands (2020)",
      color: "#A8DCB5",
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
        { label: "non-natural", color: "#D3D3D3" },
      ],
      type: "categorical",
      info: 'The Natural lands dataset is the best match because it provides a 2020 baseline map of natural vs non-natural land covers at 30m resolution, which can be used to identify intact/natural landscapes. This dataset specifically defines "natural" ecosystems as those that substantially resemble what would be found without major human impacts, making it ideal for assessing landscape intactness across Canadian provinces.',
      note: "Baseline map separating natural from non-natural lands for conversion assessments."
    },
  },
  {
    dataset_id: 4,
    dataset_name: "Tree cover loss",
    data_layer: "Tree cover loss",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_tree_cover_loss.webp",
    description:
      "Tree Cover Loss (Hansen/UMD/GLAD) maps annual global forest loss from 2001 to 2024 at 30-meter resolution using Landsat satellite imagery. It detects stand-replacement disturbances in vegetation over 5 meters tall, including natural forests and plantations. The dataset supports monitoring annual tree cover loss and deforestation trends, fire impacts, and forestry practices, and is widely used for conservation, land-use planning, and environmental policy analysis.",
    tile_url:
      "https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png?start_year=2001&end_year=2024&tree_cover_density_threshold=25&render_type=true_color",
    legend: {
      title: "Tree cover loss (2001-2024)",
      color: "#DC6C9A",
      items: [{label: "Tree cover loss", color: "#DC6C9A" }],
      type: "symbol",
      info: "Tree cover loss dataset can detect stand-replacement disturbances including plantations and supports monitoring forestry practices. The driver context layer would help distinguish harvesting from other causes of tree loss, making it ideal for tracking plantation harvesting cycles.",
      note: "Annual locations of tree cover removal across both natural forests and plantations. Tree cover canopy >30%.",
      unit: "ha",
    },
  },
  {
    dataset_id: 7,
    dataset_name: "Tree cover loss by dominant driver",
    data_layer: "Tree cover loss by dominant driver",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_tree_cover_loss_drivers.webp",
    description:
      "Shows the primary driver or cause of tree cover loss over the entire range 2001-2024. Driver classes are permanent agriculture, hard commodities, shifting cultivation, logging, wildfire, settlements & infrastructure, and other natural disturbances.",
    tile_url:
      "https://tiles.globalforestwatch.org/wri_google_tree_cover_loss_drivers/v1.12/dynamic/{z}/{x}/{y}.png?&tree_cover_density_threshold=25&render_type=true_color",
    legend: {
      title: "Tree cover loss by dominant driver (2001-2024)",
      color: "#DC6C9A",
      items: [
        { label: "Logging", color: "#52A44E"},
        { label: "Shifting cultivation", color: "#E9D700"},
        { label: "Wildfire", color: "#885128"},
        { label: "Other natural disturbances", color: "#3B209A"},
        { label: "Settlements & Infrastructure", color: "#A354A0"},
        { label: "Hard commodities", color: "#246E24"},
        { label: "Permanent Agriculture", color: "#E39D29"}
      ],
      type: "symbol",
      info: "This dataset shows the dominant driver of tree cover loss over the time period 2001-2024. The dominant driver is defined as the direct driver that caused the majority of tree cover loss within each 1 km cell over the time period.",
      note: "Shows the dominant driver of deforestation between 2001 and 2024. Tree cover canopy >30%."
    },
  },
  {
    dataset_id: 5,
    dataset_name: "Tree cover gain",
    data_layer: "Tree cover gain",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_tree_cover_gain.webp",
    description:
      "Tree Cover Gain (Hansen/UMD/GLAD) identifies areas where new tree canopy was established between 2000 and 2012 at 30-meter resolution, using Landsat 7 imagery. It captures both  natural forest regrowth and tree plantation cycles, and is useful for tracking large-scale forest recovery trends. Users should note that it is a cumulative layer and should not be combined directly with loss or tree cover data to calculate net change.",
    tile_url:
      "https://tiles.globalforestwatch.org/umd_tree_cover_gain_from_height/latest/default/{z}/{x}/{y}.png",
    legend: {
      title: "Tree cover gain (2000-2020)",
      color: "#3F08F5",
      items: [{ label: "Tree cover gain", color: "#3F08F5" }],
      type: "symbol",
      info: "Tree cover gain dataset can detect natural forest regrowth and tree plantation cycles. It is useful for tracking large-scale forest recovery trends.",
      note: "Cumulative areas where tree cover has newly established. Indicates broad patterns of regrowth and plantation expansion.",
      unit: "ha",
    },
  },
  {
    dataset_id: 7,
    dataset_name: "Tree cover",
    data_layer: "Tree cover",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_tree_cover.webp",
    description:
      "Tree Cover provides global percent tree canopy cover at 30-meter resolution for years 2000, based on Landsat 7 imagery. It represents the density of vegetation over 5 meters tall, including both natural forests and plantations. This dataset is useful for establishing historical baselines and comparing tree cover density across different landscapes.",
    tile_url:
      "https://tiles.globalforestwatch.org/umd_tree_cover_density_{year}/latest/tcd_{threshold}/{z}/{x}/{y}.png",
    legend: {
      title: "Tree cover (2000)",
      color: "#97BD3D",
      items: [{ label: "Tree cover", color: "#97BD3D" }],
      type: "symbol",
      info: "Tree cover gain dataset can detect natural forest regrowth and tree plantation cycles. It is useful for tracking large-scale forest recovery trends.",
      note: "Baseline percent tree canopy cover showing density of woody vegetation. Tree cover canopy >30%.",
      unit: "ha",
    },
  },
  {
    dataset_id: 6,
    dataset_name: "Forest greenhouse gas net flux (2001-2024)",
    data_layer: "Forest greenhouse gas net flux",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_net_flux.webp",
    description:
      "Maps the balance between emissions from forest disturbances and carbon removals from forest growth between 2001 and 2024, using a globally consistent model. This dataset supports climate reporting, forest-based mitigation strategies, and greenhouse gas inventories by identifying where forests are contributing to or helping mitigate climate change.",
    tile_url:
      "https://tiles.globalforestwatch.org/gfw_forest_carbon_net_flux/latest/dynamic/{z}/{x}/{y}.png?tree_cover_density_threshold=30",
      legend: {
        title: "GHG net flux",
        type: "divergent",
        color: "#39082a",
        items: [
          { label: "<-1500 (sink)", color: "#151d44" },
          { color: "#172447" },
          { color: "#182c4c" },
          { color: "#1a3350" },
          { color: "#1b3a54" },
          { color: "#1c4259" },
          { color: "#1c485d" },
          { color: "#1c4f62" },
          { color: "#1b5766" },
          { color: "#1a5d6a" },
          { color: "#18656e" },
          { color: "#156c72" },
          { color: "#137375" },
          { color: "#117a78" },
          { color: "#12827b" },
          { color: "#17887d" },
          { color: "#25917f" },
          { color: "#349880" },
          { color: "#419d82" },
          { color: "#52a384" },
          { color: "#61a987" },
          { color: "#6fad8b" },
          { color: "#7db390" },
          { color: "#8bb896" },
          { color: "#97bd9c" },
          { color: "#a4c3a3" },
          { color: "#b1c8ac" },
          { color: "#bcceb4" },
          { color: "#c8d4be" },
          { color: "#d3dac8" },
          { color: "#dde0d1" },
          { color: "#e9e7dd" },
          { color: "#ece4ec" },
          { color: "#e3dce7" },
          { color: "#dcd4e5" },
          { color: "#d3cce3" },
          { color: "#ccc3e3" },
          { color: "#c5bbe4" },
          { color: "#beb2e6" },
          { color: "#b9a8e8" },
          { color: "#b4a0e8" },
          { color: "#b097e7" },
          { color: "#ac8de4" },
          { color: "#a885e0" },
          { color: "#a57dd9" },
          { color: "#a174d2" },
          { color: "#9e6dca" },
          { color: "#9a65c0" },
          { color: "#945cb4" },
          { color: "#9056ab" },
          { color: "#8c4fa0" },
          { color: "#864896" },
          { color: "#82438c" },
          { color: "#7c3d82" },
          { color: "#763777" },
          { color: "#70326e" },
          { color: "#6a2d64" },
          { color: "#63275a" },
          { color: "#5c2352" },
          { color: "#551e48" },
          { label: `>1500 (source)`, color: "#39082a" },
        ],
      info: "This dataset maps the balance between emissions from forest disturbances and carbon removals from forest growth, making it ideal for identifying where forests are contributing to or helping mitigate climate change.",
      note: "Balance between forest emissions and removals. Tree cover canopy >30%.",
      unit: "tCO2e/ha",
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
