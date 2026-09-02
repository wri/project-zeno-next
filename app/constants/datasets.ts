import type { DatasetInfo } from "@/app/types/chat";

const EOAPI_HOST =
  process.env.NEXT_PUBLIC_EOAPI_HOST ||
  "https://eoapi-cache.globalnaturewatch.org/";

// UI card config that may omit some DatasetInfo fields; we'll fill defaults
export type DatasetLegendConfig = {
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

/**
 * Thematic groupings used to filter the Data Catalog panel.
 * `all` and `in-conversation` are virtual (not assigned per card).
 */
export type DatasetCategoryId =
  | "all"
  | "in-conversation"
  | "land-use"
  | "disturbance"
  | "wildfires";

export const DATASET_CATEGORIES: { id: DatasetCategoryId; label: string }[] = [
  { id: "all", label: "All datasets" },
  { id: "in-conversation", label: "In this conversation" },
  { id: "land-use", label: "Land use" },
  { id: "disturbance", label: "Disturbance" },
  { id: "wildfires", label: "Wildfires" },
];

/** Categories assigned to dataset cards (excludes virtual ones above). */
export type AssignableDatasetCategoryId = Exclude<
  DatasetCategoryId,
  "all" | "in-conversation"
>;

/** One of a dataset card's primary, independently-toggleable data layers. */
export type DatasetCardLayer = {
  name: string;
  tile_url: string;
  /** Falls back to the card's top-level `legend` when omitted. */
  legend?: DatasetLegendConfig;
};

export type DatasetCardConfig = {
  dataset_id: number;
  dataset_name: string;
  /**
   * Short label used in compact UI such as analysis-parameter chips, where the
   * full dataset_name is too long. Omit when the full name is already short.
   */
  shortName?: string;
  description: string;
  img?: string;
  tile_url?: string;
  /**
   * The dataset's primary layer(s). Most cards omit this and rely on the
   * single `tile_url` above; LGMS declares two (agriculture, lulucf) that can
   * be toggled independently. When present, this is authoritative and
   * `tile_url` is ignored by layer-building code.
   */
  layers?: DatasetCardLayer[];
  data_layer?: string;
  context_layer?: string | null;
  threshold?: number | null;
  legend?: DatasetLegendConfig;
  cadence?: string;
  resolution?: string;
  geographic_coverage?: string;
  provider?: string;
  methodology?: string;
  citation?: string;
  viewOnly?: boolean;
  /**
   * Gates the card behind a URL feature flag (`?ff=<flag>`): browse surfaces
   * (Data Catalog, layer menu) only list it while the flag is on. The card
   * stays in `DATASET_CARDS` either way, so a layer that is already on the map
   * keeps resolving its legend.
   */
  featureFlag?: string;
  defaultStartYear?: number;
  defaultEndYear?: number;
  /**
   * Thematic categories used by the Data Catalog panel filter chips.
   * A dataset may belong to multiple categories (e.g. fire-driven loss is
   * both `disturbance` and `wildfires`).
   */
  categories?: AssignableDatasetCategoryId[];
};

export type VectorStyleSpec = {
  property: string; // feature attribute to key on, e.g. "year"
  coerceToString?: boolean; // wrap in ["to-string", ...] for type-safe match
  colorMap: { value: string | number; color: string }[];
  fallbackColor?: string; // default "transparent" => unstyled
};

export type ContextLayerMetadata = {
  dataset_id: number;
  dataset_name: string;
  context_layer: string | null;
  description: string;
  tile_url?: string;
  legend: DatasetLegendConfig;
  vectorStyle?: VectorStyleSpec;
};

export const CONTEXT_LAYER_METADATA: Record<string, ContextLayerMetadata> = {
  primary_forest: {
    dataset_id: 100,
    dataset_name: "Primary Forests",
    context_layer: null as string | null,
    description:
      "Primary forests are among the most biodiverse forests, providing a multitude of ecosystem services, making them crucial to monitor for national land use planning and carbon accounting. This dataset defines primary forests as mature natural humid tropical forest cover that has not been completely cleared and regrown in recent history. Researchers classified Landsat images into primary forest data using a separate algorithm for each region. The dataset maps the extent of primary forests in the global pan-tropical regions in 2001 at 30-meter resolution.",
    legend: {
      title: "Primary Forests (2001)",
      color: "#054A29",
      items: [{ label: "Primary forest", color: "#054A29" }],
      type: "symbol",
      info: "Primary forests are defined as mature natural humid tropical forest cover that has not been completely cleared and regrown in recent history. This layer maps their pan-tropical extent in 2001 and is useful as a baseline for assessing forest integrity and biodiversity value.",
      note: "Extent of primary humid tropical forests in 2001. Pan-tropical coverage at 30m resolution (UMD/GLAD).",
    },
  },
  intact_forest: {
    dataset_id: 101,
    dataset_name: "Intact Forest Landscapes",
    context_layer: null as string | null,
    description:
      "The Intact Forest Landscapes (IFL) data set identifies unbroken expanses of natural ecosystems within the zone of forest extent that show no signs of significant human activity and are large enough that all native biodiversity, including viable populations of wide-ranging species, could be maintained.",
    legend: {
      title: "Intact Forest Landscapes (2000-2025)",
      color: "#5C8C50",
      items: [
        { label: "Intact Forest Landscapes", color: "#5C8C50" },
        { label: "Reduction in extent 2000-2013", color: "#91896F" },
        { label: "Reduction in extent 2013-2016", color: "#969904" },
        { label: "Reduction in extent 2016-2020", color: "#635731" },
      ],
      type: "symbol",
      info: "Identifies the world's last remaining unfragmented forest landscapes, large enough to retain all native biodiversity and showing no signs of human alteration.",
      note: "Extent of Intact Forest Landscapes (IFL) in 2000-2025. Global coverage, IFL Mapping Team.",
    },
    vectorStyle: {
      property: "year",
      coerceToString: true, // tiles may encode 2000 as number or string
      colorMap: [{ value: 2000, color: "#5C8C50" }],
      fallbackColor: "transparent", // every other year stays unstyled
    },
  },
};

/**
 * Feature flag gating the standalone Intact Forest Landscapes card while
 * researchers review it (PZB-1231). Opt in with `?ff=ifl`.
 */
export const IFL_FEATURE_FLAG = "ifl";

/**
 * Standalone IFL raster tiles. Same endpoint the backend hands back as the
 * `intact_forest` context layer, so the card and the context sub-layer render
 * from one source.
 */
const INTACT_FOREST_TILE_URL =
  "https://tiles.globalforestwatch.org/ifl_intact_forest_landscapes/v2025/default/{z}/{x}/{y}.png";

// Shared -45..+45 MgCO2e/ha/yr diverging color scale for LGMS net flux,
// reused by the combined legend and each sublayer's own legend below (the
// data range is dataset-wide; only title/info/note/unit differ per layer).
const LGMS_NET_FLUX_COLOR = "#3D2807";
const LGMS_NET_FLUX_ITEMS: DatasetLegendConfig["items"] = [
  { label: "-45.0 (sink)", color: "#003C30" },
  { color: "#036860" },
  { color: "#3C9C94" },
  { color: "#8AD1C6" },
  { color: "#D0ECE7" },
  { color: "#F5F2E5" },
  { color: "#EFDDAF" },
  { color: "#D4AC62" },
  { color: "#AC6F20" },
  { color: "#77470B" },
  { color: "#4D310A" },
  { label: "+45.0 (source)", color: LGMS_NET_FLUX_COLOR },
];

export const DATASET_CARDS: (DatasetCardConfig & { img?: string })[] = [
  {
    dataset_id: 11,
    dataset_name: "Integrated alerts",
    shortName: "Integrated alerts",
    data_layer: "Integrated alerts",
    context_layer: null as string | null,
    img: "/dataset_card_dist_alerts.webp",
    cadence: "daily",
    resolution: "10 m",
    geographic_coverage: "global",
    provider: "GFW",
    description:
      "Integrated Alerts aggregates near-real-time deforestation and vegetation disturbance alerts from DIST-ALERT, GLAD-L, GLAD-S2, and RADD into a single 10-meter global layer. Alerts are classified by confidence level: low, high, and highest.",
    methodology:
      "The integrated layer combines DIST-ALERT, GLAD-L, GLAD-S2, and RADD alerts on a common 10-meter grid, avoiding double counting of overlapping alerts by classifying them at a higher confidence level. Alerts from multiple systems within 180 days are treated as a single event.",
    citation:
      '"Global Integrated Disturbance Alerts". UMD/GLAD and WUR, accessed through Global Forest Watch.',
    tile_url:
      "https://tiles.globalforestwatch.org/gfw_integrated_dist_alerts/latest/dynamic/{z}/{x}/{y}.png?render_type=true_color",
    legend: {
      title: "Integrated Deforestation Alerts",
      color: "#C92A6D",
      items: [
        { label: "Low confidence", color: "#EDA4C2" },
        { label: "High confidence", color: "#DC6699" },
        { label: "Highest confidence", color: "#C92A6D" },
      ],
      type: "symbol",
      info: "Integrated alerts show potential near-real-time vegetation and forest disturbance from four alert systems: DIST-ALERT, GLAD-L, GLAD-S2, and RADD. Highest confidence alerts were detected by multiple systems.",
      note: "Near-real-time integrated disturbance alerts by confidence level. Alerts indicate potential disturbance, not definitive deforestation or permanent conversion.",
    },
  },
  {
    dataset_id: 1,
    dataset_name: "Global land cover",
    shortName: "Land cover",
    context_layer: null as string | null,
    img: "/dataset_card_land_cover.webp",
    cadence: "annual",
    resolution: "30 m",
    geographic_coverage: "global",
    provider: "GLAD / GPW",
    categories: ["land-use"],
    description:
      "This Global Land Cover dataset is a combination of two global datasets: the GLAD Land Cover and Land Use Change annual data and the Global Pasture Watch Grassland Class Collection 2 Cultivated Grasslands annual data. This combination is annual from 2015 through 2024. This dataset shows land covers and uses including: bare ground and sparsevegetation, short vegetation, tree cover, wetlands, water, snow/ice, cropland, cultivated grasslands, and built-up land.",
    tile_url: `${EOAPI_HOST}/raster/collections/global-land-cover-v-2/items/global-land-cover-2024/tiles/WebMercatorQuad/{z}/{x}/{y}.png?colormap=%7B%221%22%3A%20%5B254%2C%20254%2C%20204%5D%2C%222%22%3A%20%5B185%2C%20185%2C%2030%5D%2C%223%22%3A%20%5B36%2C%20110%2C%2036%5D%2C%224%22%3A%20%5B116%2C%20214%2C%20180%5D%2C%225%22%3A%20%5B107%2C%20174%2C%20214%5D%2C%226%22%3A%20%5B172%2C%20209%2C%20232%5D%2C%227%22%3A%20%5B255%2C%20241%2C%20131%5D%2C%228%22%3A%20%5B232%2C%20118%2C%2093%5D%2C%229%22%3A%20%5B255%2C%20205%2C%20115%5D%7D&assets=asset&expression=asset%2A%28asset%3C10%29%2A%28asset%3E0%29&asset_as_band=True`,
    legend: {
      title: "Global land cover (2024)",
      color: "#8E3037",
      items: [
        { label: "forest", color: "#246E24" },
        { label: "wet vegetation", color: "#74D6B4" },
        { label: "short vegetation", color: "#B9B91E" },
        { label: "bare", color: "#FEFECC" },
        { label: "water", color: "#6BAED6" },
        { label: "ice", color: "#ACD1E8" },
        { label: "cropland", color: "#fff183" },
        { label: "cultivated grasslands", color: "#FFCD73" },
        { label: "built-up", color: "#e8765d" },
      ],
      type: "categorical",
      info: "This dataset includes built-up land as one of its land cover classes, which directly corresponds to urban areas. It provides global coverage with annual data from 2015-2024, making it the most appropriate dataset to answer questions about urban area extent worldwide.",
      note: "Single-year global land cover snapshot for composition and baseline context.",
    },
  },
  {
    dataset_id: 2,
    dataset_name: "Global natural/semi-natural grassland extent",
    shortName: "Grasslands",
    context_layer: null as string | null,
    img: "/dataset_card_grasslands.webp",
    cadence: "annual",
    resolution: "30 m",
    geographic_coverage: "global",
    provider: "GPW Consortium, LCL",
    categories: ["land-use"],
    description:
      "Annual 30 m maps of global natural/semi-natural grassland extent from 2000 to 2022. This dataset defines grasslands very broadly such that they encompass grasslands, shrublands, and savannas by including any land cover type which contains at least 30% of dry or wet low vegetation, dominated by grasses and forbs (less than 3 meters) and a: maximum of 50% tree canopy cover (greater than 5 meters), a maximum of 70% of other woody vegetation (scrubs and open shrubland), and a maximum of 50% active cropland cover in mosaic landscapes of cropland & other vegetation.",
    tile_url: `${EOAPI_HOST}/raster/collections/grasslands-v-1/items/grasslands-2022/tiles/WebMercatorQuad/{z}/{x}/{y}.png?colormap=%7B%220%22%3A%20%5B0%2C%200%2C%200%2C%200%5D%2C%20%221%22%3A%20%5B0%2C%200%2C%200%2C%200%5D%2C%20%222%22%3A%20%5B255%2C%20153%2C%2022%2C%20255%5D%2C%20%223%22%3A%20%5B0%2C%200%2C%200%2C%200%5D%7D&assets=asset&expression=asset%2A%28asset%3C4%29%2A%28asset%3E%3D0%29&asset_as_band=True`,
    legend: {
      title: "Global Grasslands (2000-2022)",
      color: "#ff9916",
      items: [{ label: "Natural/semi-natural grassland", color: "#ff9916" }],
      type: "symbol",
      info: "This dataset provides global coverage with annual data from 2000-2024, making it the most appropriate dataset to answer questions about grassland area extent worldwide.",
      note: "Annual maps of natural and semi-natural grasslands including savannas and shrublands.",
      unit: "ha",
    },
  },
  {
    dataset_id: 3,
    dataset_name: "SBTN Natural Lands Map",
    shortName: "Natural lands",
    context_layer: null as string | null,
    img: "/dataset_card_natural_lands.webp",
    cadence: "2020",
    resolution: "30 m",
    geographic_coverage: "global",
    provider: "SBTN, WRI",
    categories: ["land-use"],
    description:
      "The SBTN Natural Lands Map v1.1 is a 2020 baseline map of natural and non-natural land covers intended for use by companies setting science-based targets for nature, specifically the SBTN Land target #1: no conversion of natural ecosystems. This map is global with 30m resolution and was made by compiling existing global and regional data including the GLAD Global Land Cover and Change data, ESA WorldCover, and many other land cover and use datasets.",
    tile_url: `${EOAPI_HOST}/raster/collections/natural-lands-v-1-1/tiles/WebMercatorQuad/{z}/{x}/{y}.png?colormap=%7B%222%22%3A%20%5B36%2C%20110%2C%2036%2C%20255%5D%2C%20%223%22%3A%20%5B185%2C%20185%2C%2030%2C%20255%5D%2C%20%224%22%3A%20%5B107%2C%20174%2C%20214%2C%20255%5D%2C%20%225%22%3A%20%5B6%2C%20162%2C%20133%2C%20255%5D%2C%20%226%22%3A%20%5B254%2C%20254%2C%20204%2C%20255%5D%2C%20%227%22%3A%20%5B172%2C%20209%2C%20232%2C%20255%5D%2C%20%228%22%3A%20%5B88%2C%20149%2C%2088%2C%20255%5D%2C%20%229%22%3A%20%5B9%2C%2061%2C%209%2C%20255%5D%2C%20%2210%22%3A%20%5B219%2C%20219%2C%20123%2C%20255%5D%2C%20%2211%22%3A%20%5B153%2C%20153%2C%2026%2C%20255%5D%2C%20%2212%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2213%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2214%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2215%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2216%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2217%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2218%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2219%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2220%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%2C%20%2221%22%3A%20%5B211%2C%20211%2C%20211%2C%20255%5D%7D&assets=asset&expression=asset%2A%28asset%3C22%29%2A%28asset%3E1%29&asset_as_band=True`,
    legend: {
      title: "SBTN Natural lands (2020)",
      color: "#A8DCB5",
      items: [
        { label: "natural forests", color: "#246E24" },
        { label: "natural peat forests", color: "#093D09" },
        { label: "mangroves", color: "#06A285" },
        { label: "wet natural forests", color: "#589558" },
        { label: "natural peat short vegetation", color: "#99991A" },
        { label: "natural short vegetation", color: "#B9B91E" },
        { label: "wet natural short vegetation", color: "#DBDB7B" },
        { label: "natural water", color: "#6BAED6" },
        { label: "snow", color: "#ACD1E8" },
        { label: "bare", color: "#FEFECC" },
        { label: "non-natural", color: "#D3D3D3" },
      ],
      type: "symbol",
      info: 'The Natural lands dataset is the best match because it provides a 2020 baseline map of natural vs non-natural land covers at 30m resolution, which can be used to identify intact/natural landscapes. This dataset specifically defines "natural" ecosystems as those that substantially resemble what would be found without major human impacts, making it ideal for assessing landscape intactness across Canadian provinces.',
      note: "Baseline map separating natural from non-natural lands for conversion assessments. This map may overestimate the extent of natural lands.",
    },
  },
  {
    // Contextual-only layer: IFL has no analytics endpoint, so the card is
    // flagged `viewOnly` and the catalogue badges it VIEW ONLY. Name, colors
    // and description are reused from the context-layer metadata above so the
    // standalone layer and the sub-layer under Tree Cover Loss stay identical.
    dataset_id: CONTEXT_LAYER_METADATA.intact_forest.dataset_id,
    dataset_name: CONTEXT_LAYER_METADATA.intact_forest.dataset_name,
    shortName: "Intact forests",
    context_layer: null,
    cadence: "2000-2025",
    resolution: "30 m",
    geographic_coverage: "global",
    provider: "IFL Mapping Team",
    categories: ["land-use"],
    viewOnly: true,
    featureFlag: IFL_FEATURE_FLAG,
    description: CONTEXT_LAYER_METADATA.intact_forest.description,
    tile_url: INTACT_FOREST_TILE_URL,
    legend: CONTEXT_LAYER_METADATA.intact_forest.legend,
  },
  {
    dataset_id: 4,
    dataset_name: "Tree cover loss",
    data_layer: "Tree cover loss",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_tree_cover_loss.webp",
    cadence: "annual",
    resolution: "30 m",
    geographic_coverage: "global",
    provider: "UMD",
    defaultStartYear: 2001,
    defaultEndYear: 2025,
    categories: ["disturbance"],
    description:
      "Tree Cover Loss (Hansen/UMD/GLAD) maps annual global forest loss from 2001 to 2025 at 30-meter resolution using Landsat satellite imagery. It detects stand-replacement disturbances in vegetation over 5 meters tall, including natural forests and plantations. The dataset supports monitoring annual tree cover loss and deforestation trends, fire impacts, and forestry practices, and is widely used for conservation, land-use planning, and environmental policy analysis.",
    tile_url:
      "https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png?tree_cover_density_threshold=30&render_type=true_color",
    legend: {
      title: "Tree cover loss (2001-2025)",
      color: "#DC6C9A",
      items: [{ label: "Tree cover loss", color: "#DC6C9A" }],
      type: "symbol",
      info: "Tree cover loss dataset can detect stand-replacement disturbances including plantations and supports monitoring forestry practices. The driver context layer would help distinguish harvesting from other causes of tree loss, making it ideal for tracking plantation harvesting cycles.",
      note: "Annual locations of tree cover removal across both natural forests and plantations at the selected canopy density threshold.",
      unit: "ha",
    },
  },
  {
    dataset_id: 8,
    dataset_name: "Tree cover loss by dominant driver",
    shortName: "TCL by driver",
    data_layer: "Tree cover loss by dominant driver",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_tree_cover_loss_drivers.webp",
    cadence: "2001-2025",
    resolution: "1 km",
    geographic_coverage: "global",
    provider: "WRI / Google",
    categories: ["disturbance"],
    description:
      "Shows the primary driver or cause of tree cover loss over the entire range 2001-2025. Driver classes are permanent agriculture, hard commodities, shifting cultivation, logging, wildfire, settlements & infrastructure, and other natural disturbances.",
    tile_url:
      "https://tiles.globalforestwatch.org/wri_google_tree_cover_loss_drivers/v1.12/dynamic/{z}/{x}/{y}.png?tree_cover_density_threshold=30&render_type=true_color",
    legend: {
      title: "Tree cover loss by dominant driver (2001-2025)",
      color: "#DC6C9A",
      items: [
        { label: "logging", color: "#52A44E" },
        { label: "shifting cultivation", color: "#E9D700" },
        { label: "wildfire", color: "#885128" },
        { label: "other natural disturbances", color: "#3B209A" },
        { label: "settlements & infrastructure", color: "#A354A0" },
        { label: "hard commodities", color: "#E58074" },
        { label: "permanent agriculture", color: "#E39D29" },
      ],
      type: "symbol",
      info: "This dataset shows the dominant driver of tree cover loss over the time period 2001-2025. The dominant driver is defined as the direct driver that caused the majority of tree cover loss within each 1 km cell over the time period.",
      note: "Shows the dominant driver of deforestation between 2001 and 2025 at the selected canopy density.",
    },
  },
  {
    dataset_id: 5,
    dataset_name: "Tree cover gain",
    data_layer: "Tree cover gain",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_tree_cover_gain.webp",
    cadence: "20 years",
    resolution: "30 m",
    geographic_coverage: "global",
    provider: "UMD",
    categories: ["land-use"],
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
    cadence: "2000",
    resolution: "30 m",
    geographic_coverage: "global",
    provider: "UMD",
    categories: ["land-use"],
    description:
      "Tree Cover provides global percent tree canopy cover at 30-meter resolution for the year 2000 based on Landsat 7 imagery. It represents the density of vegetation over 5 meters tall, including both natural forests and plantations. This dataset is useful for establishing historical baselines and comparing tree cover density across different landscapes.",
    tile_url:
      "https://tiles.globalforestwatch.org/umd_tree_cover_density_2000/v1.8/tcd_30/{z}/{x}/{y}.png",
    legend: {
      title: "Tree cover (2000)",
      color: "#97BD3D",
      items: [{ label: "Tree cover", color: "#97BD3D" }],
      type: "symbol",
      info: "Tree cover gain dataset can detect natural forest regrowth and tree plantation cycles. It is useful for tracking large-scale forest recovery trends.",
      note: "Baseline percent tree canopy cover showing density of woody vegetation at the selected canopy density.",
      unit: "ha",
    },
  },
  {
    dataset_id: 10,
    dataset_name: "Tree cover loss due to fires",
    shortName: "TCL from fires",
    data_layer: "Tree cover loss due to fires",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_tree_cover_loss.webp",
    cadence: "annual",
    resolution: "30 m",
    geographic_coverage: "global",
    provider: "UMD",
    defaultStartYear: 2001,
    defaultEndYear: 2025,
    categories: ["disturbance", "wildfires"],
    description:
      "Tree Cover Loss due to Fires (Hansen/UMD/GLAD) maps annual global tree cover loss attributed to fire from 2001 to 2025 at 30-meter resolution. This subset of the broader Tree Cover Loss dataset isolates fire-driven stand-replacement disturbances in vegetation over 5 meters tall, helping users understand where fire is a dominant driver of forest loss.",
    tile_url:
      "https://tiles.globalforestwatch.org/umd_tree_cover_loss_from_fires/latest/dynamic/{z}/{x}/{y}.png?tree_cover_density_threshold=30&render_type=true_color",
    methodology:
      "Tree cover loss due to fires is derived by overlaying the Hansen/UMD/GLAD global annual tree cover loss dataset with the MCD64A1 burned area product (MODIS). A tree cover loss pixel (30 m) is attributed to fire when a MODIS burned area detection occurs within the same 500 m grid cell and calendar year. Only stand-replacement disturbances in woody vegetation taller than 5 m are included, at the selected canopy density threshold.",
    citation:
      'Hansen, M. C., P. V. Potapov, R. Moore, M. Hancher, S. A. Turubanova, A. Tyukavina, D. Thau, S. V. Stehman, S. J. Goetz, T. R. Loveland, A. Kommareddy, A. Egorov, L. Chini, C. O. Justice, and J. R. G. Townshend. 2013. "High-Resolution Global Maps of 21st-Century Forest Cover Change." *Science* 342 (6160): 850–53. https://doi.org/10.1126/science.1244693',
    legend: {
      title: "Tree cover loss due to fires (2001-2025)",
      color: "#9A5B50 ",
      items: [{ label: "Tree cover loss due to fire", color: "#9A5B50" }],
      type: "symbol",
      info: "This dataset isolates fire as a cause of tree cover loss, showing annual locations where fire-driven stand-replacement disturbances have occurred in forests. Useful for understanding the spatial extent and temporal trends of fire impact on forests.",
      note: "Annual locations of fire-driven tree cover removal at the selected canopy density threshold.",
      unit: "ha",
    },
  },
  {
    dataset_id: 6,
    dataset_name: "Forest greenhouse gas net flux (2001-2025)",
    shortName: "GHG net flux",
    data_layer: "Forest greenhouse gas net flux",
    context_layer: null,
    threshold: 30,
    img: "/dataset_card_net_flux.webp",
    cadence: "",
    resolution: "30 m",
    geographic_coverage: "global",
    provider: "WRI",
    categories: ["disturbance"],
    description:
      "Maps the balance between emissions from forest disturbances and carbon removals from forest growth between 2001 and 2025, using a globally consistent model. This dataset supports climate reporting, forest-based mitigation strategies, and greenhouse gas inventories by identifying where forests are contributing to or helping mitigate climate change.",
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
      note: "Balance between forest emissions and removals at the selected canopy density.",
      unit: "tCO2e/ha",
    },
  },
  {
    dataset_id: 12,
    dataset_name: "Land GHG Monitoring System (LGMS)",
    shortName: "LGMS net flux",
    data_layer: "Land GHG Monitoring System (LGMS)",
    context_layer: null,
    img: "/dataset_card_net_flux.webp",
    cadence: "annual",
    resolution: "reported per admin area",
    geographic_coverage:
      "GADM administrative areas (country, state/province, district) only",
    provider: "WRI",
    defaultStartYear: 2016,
    defaultEndYear: 2024,
    categories: ["land-use"],
    description:
      "Maps annual gross greenhouse-gas emissions, gross CO2 removals, and net GHG flux from land — vegetation, soil, and agriculture — for GADM administrative areas from 2016 to 2024. Values are in MgCO2e; emissions are positive (a source), removals negative (a sink).",
    // TODO(PZB-1247): both layers currently point at the same combined
    // net-flux mosaic as a placeholder — project-zeno-data-infra doesn't yet
    // publish separate agriculture/lulucf COG mosaics. Swap in the real
    // per-category tile URLs once those pipelines exist.
    layers: [
      {
        name: "lulucf",
        tile_url:
          "https://tiles.globalforestwatch.org/cog/mosaic/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=s3://gfw-data-lake/wri_land_ghg_monitoring_system/v1.0.3/raster/epsg-4326/cog/mosaic.json&nodata=0&colormap=%5B%5B%5B-45.0%2C-42.977%5D%2C%5B0%2C60%2C48%2C255%5D%5D%2C%5B%5B-42.977%2C-40.985%5D%2C%5B0%2C67%2C56%2C255%5D%5D%2C%5B%5B-40.985%2C-39.05%5D%2C%5B0%2C75%2C64%2C255%5D%5D%2C%5B%5B-39.05%2C-37.12%5D%2C%5B1%2C82%2C72%2C255%5D%5D%2C%5B%5B-37.12%2C-35.274%5D%2C%5B1%2C89%2C80%2C255%5D%5D%2C%5B%5B-35.274%2C-33.434%5D%2C%5B1%2C97%2C88%2C255%5D%5D%2C%5B%5B-33.434%2C-31.626%5D%2C%5B3%2C104%2C96%2C255%5D%5D%2C%5B%5B-31.626%2C-29.878%5D%2C%5B13%2C113%2C105%2C255%5D%5D%2C%5B%5B-29.878%2C-28.163%5D%2C%5B22%2C121%2C113%2C255%5D%5D%2C%5B%5B-28.163%2C-26.51%5D%2C%5B31%2C130%2C122%2C255%5D%5D%2C%5B%5B-26.51%2C-24.863%5D%2C%5B40%2C139%2C131%2C255%5D%5D%2C%5B%5B-24.863%2C-23.278%5D%2C%5B49%2C147%2C139%2C255%5D%5D%2C%5B%5B-23.278%2C-21.729%5D%2C%5B60%2C156%2C148%2C255%5D%5D%2C%5B%5B-21.729%2C-20.215%5D%2C%5B73%2C166%2C156%2C255%5D%5D%2C%5B%5B-20.215%2C-18.767%5D%2C%5B86%2C175%2C165%2C255%5D%5D%2C%5B%5B-18.767%2C-17.326%5D%2C%5B99%2C184%2C174%2C255%5D%5D%2C%5B%5B-17.326%2C-15.951%5D%2C%5B113%2C194%2C183%2C255%5D%5D%2C%5B%5B-15.951%2C-14.646%5D%2C%5B126%2C203%2C191%2C255%5D%5D%2C%5B%5B-14.646%2C-13.348%5D%2C%5B138%2C209%2C198%2C255%5D%5D%2C%5B%5B-13.348%2C-12.122%5D%2C%5B151%2C214%2C204%2C255%5D%5D%2C%5B%5B-12.122%2C-10.935%5D%2C%5B163%2C219%2C211%2C255%5D%5D%2C%5B%5B-10.935%2C-9.79%5D%2C%5B175%2C224%2C217%2C255%5D%5D%2C%5B%5B-9.79%2C-8.686%5D%2C%5B188%2C229%2C223%2C255%5D%5D%2C%5B%5B-8.686%2C-7.66%5D%2C%5B200%2C234%2C229%2C255%5D%5D%2C%5B%5B-7.66%2C-6.679%5D%2C%5B208%2C236%2C231%2C255%5D%5D%2C%5B%5B-6.679%2C-5.742%5D%2C%5B216%2C238%2C233%2C255%5D%5D%2C%5B%5B-5.742%2C-4.891%5D%2C%5B224%2C240%2C235%2C255%5D%5D%2C%5B%5B-4.891%2C-4.049%5D%2C%5B232%2C242%2C237%2C255%5D%5D%2C%5B%5B-4.049%2C-3.298%5D%2C%5B240%2C244%2C239%2C255%5D%5D%2C%5B%5B-3.298%2C-2.598%5D%2C%5B245%2C244%2C237%2C255%5D%5D%2C%5B%5B-2.598%2C-2.0%5D%2C%5B245%2C242%2C229%2C255%5D%5D%2C%5B%5B-2.0%2C2.0%5D%2C%5B245%2C240%2C221%2C255%5D%5D%2C%5B%5B2.0%2C2.598%5D%2C%5B246%2C237%2C214%2C255%5D%5D%2C%5B%5B2.598%2C3.298%5D%2C%5B246%2C235%2C206%2C255%5D%5D%2C%5B%5B3.298%2C4.049%5D%2C%5B246%2C233%2C198%2C255%5D%5D%2C%5B%5B4.049%2C4.891%5D%2C%5B243%2C228%2C187%2C255%5D%5D%2C%5B%5B4.891%2C5.742%5D%2C%5B239%2C221%2C175%2C255%5D%5D%2C%5B%5B5.742%2C6.679%5D%2C%5B235%2C215%2C163%2C255%5D%5D%2C%5B%5B6.679%2C7.66%5D%2C%5B231%2C208%2C151%2C255%5D%5D%2C%5B%5B7.66%2C8.686%5D%2C%5B227%2C201%2C138%2C255%5D%5D%2C%5B%5B8.686%2C9.79%5D%2C%5B223%2C195%2C126%2C255%5D%5D%2C%5B%5B9.79%2C10.935%5D%2C%5B218%2C184%2C112%2C255%5D%5D%2C%5B%5B10.935%2C12.122%5D%2C%5B212%2C172%2C98%2C255%5D%5D%2C%5B%5B12.122%2C13.348%5D%2C%5B207%2C161%2C84%2C255%5D%5D%2C%5B%5B13.348%2C14.646%5D%2C%5B201%2C150%2C70%2C255%5D%5D%2C%5B%5B14.646%2C15.951%5D%2C%5B196%2C138%2C56%2C255%5D%5D%2C%5B%5B15.951%2C17.326%5D%2C%5B189%2C127%2C44%2C255%5D%5D%2C%5B%5B17.326%2C18.767%5D%2C%5B180%2C119%2C38%2C255%5D%5D%2C%5B%5B18.767%2C20.215%5D%2C%5B172%2C111%2C32%2C255%5D%5D%2C%5B%5B20.215%2C21.729%5D%2C%5B163%2C102%2C26%2C255%5D%5D%2C%5B%5B21.729%2C23.278%5D%2C%5B154%2C94%2C19%2C255%5D%5D%2C%5B%5B23.278%2C24.863%5D%2C%5B145%2C86%2C13%2C255%5D%5D%2C%5B%5B24.863%2C26.51%5D%2C%5B136%2C79%2C10%2C255%5D%5D%2C%5B%5B26.51%2C28.163%5D%2C%5B128%2C75%2C11%2C255%5D%5D%2C%5B%5B28.163%2C29.878%5D%2C%5B119%2C71%2C11%2C255%5D%5D%2C%5B%5B29.878%2C31.626%5D%2C%5B111%2C67%2C12%2C255%5D%5D%2C%5B%5B31.626%2C33.434%5D%2C%5B103%2C63%2C12%2C255%5D%5D%2C%5B%5B33.434%2C35.274%5D%2C%5B94%2C59%2C13%2C255%5D%5D%2C%5B%5B35.274%2C37.12%5D%2C%5B88%2C56%2C12%2C255%5D%5D%2C%5B%5B37.12%2C39.05%5D%2C%5B83%2C53%2C11%2C255%5D%5D%2C%5B%5B39.05%2C40.985%5D%2C%5B77%2C49%2C10%2C255%5D%5D%2C%5B%5B40.985%2C42.977%5D%2C%5B72%2C46%2C9%2C255%5D%5D%2C%5B%5B42.977%2C45.0%5D%2C%5B66%2C43%2C8%2C255%5D%5D%2C%5B%5B45.0%2C1000%5D%2C%5B61%2C40%2C7%2C255%5D%5D%5D",
        legend: {
          title: "LGMS lulucf net flux (2016-2024 average)",
          type: "divergent",
          color: LGMS_NET_FLUX_COLOR,
          items: LGMS_NET_FLUX_ITEMS,
          info: "This layer maps the average annual net greenhouse-gas flux from land use, land-use change and forestry (vegetation and soil) from 2016-2024, showing where land is acting as a net carbon source or sink.",
          note: "Average 2016-2024 LULUCF net flux at the administrative-area level.",
          unit: "Mg CO2e/ha/yr",
        },
      },
      {
        name: "agriculture",
        tile_url:
          "https://tiles.globalforestwatch.org/cog/mosaic/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=s3://gfw-data-lake/wri_land_ghg_monitoring_system/v1.0.3/raster/epsg-4326/cog/mosaic.json&nodata=0&colormap=%5B%5B%5B-45.0%2C-42.977%5D%2C%5B0%2C60%2C48%2C255%5D%5D%2C%5B%5B-42.977%2C-40.985%5D%2C%5B0%2C67%2C56%2C255%5D%5D%2C%5B%5B-40.985%2C-39.05%5D%2C%5B0%2C75%2C64%2C255%5D%5D%2C%5B%5B-39.05%2C-37.12%5D%2C%5B1%2C82%2C72%2C255%5D%5D%2C%5B%5B-37.12%2C-35.274%5D%2C%5B1%2C89%2C80%2C255%5D%5D%2C%5B%5B-35.274%2C-33.434%5D%2C%5B1%2C97%2C88%2C255%5D%5D%2C%5B%5B-33.434%2C-31.626%5D%2C%5B3%2C104%2C96%2C255%5D%5D%2C%5B%5B-31.626%2C-29.878%5D%2C%5B13%2C113%2C105%2C255%5D%5D%2C%5B%5B-29.878%2C-28.163%5D%2C%5B22%2C121%2C113%2C255%5D%5D%2C%5B%5B-28.163%2C-26.51%5D%2C%5B31%2C130%2C122%2C255%5D%5D%2C%5B%5B-26.51%2C-24.863%5D%2C%5B40%2C139%2C131%2C255%5D%5D%2C%5B%5B-24.863%2C-23.278%5D%2C%5B49%2C147%2C139%2C255%5D%5D%2C%5B%5B-23.278%2C-21.729%5D%2C%5B60%2C156%2C148%2C255%5D%5D%2C%5B%5B-21.729%2C-20.215%5D%2C%5B73%2C166%2C156%2C255%5D%5D%2C%5B%5B-20.215%2C-18.767%5D%2C%5B86%2C175%2C165%2C255%5D%5D%2C%5B%5B-18.767%2C-17.326%5D%2C%5B99%2C184%2C174%2C255%5D%5D%2C%5B%5B-17.326%2C-15.951%5D%2C%5B113%2C194%2C183%2C255%5D%5D%2C%5B%5B-15.951%2C-14.646%5D%2C%5B126%2C203%2C191%2C255%5D%5D%2C%5B%5B-14.646%2C-13.348%5D%2C%5B138%2C209%2C198%2C255%5D%5D%2C%5B%5B-13.348%2C-12.122%5D%2C%5B151%2C214%2C204%2C255%5D%5D%2C%5B%5B-12.122%2C-10.935%5D%2C%5B163%2C219%2C211%2C255%5D%5D%2C%5B%5B-10.935%2C-9.79%5D%2C%5B175%2C224%2C217%2C255%5D%5D%2C%5B%5B-9.79%2C-8.686%5D%2C%5B188%2C229%2C223%2C255%5D%5D%2C%5B%5B-8.686%2C-7.66%5D%2C%5B200%2C234%2C229%2C255%5D%5D%2C%5B%5B-7.66%2C-6.679%5D%2C%5B208%2C236%2C231%2C255%5D%5D%2C%5B%5B-6.679%2C-5.742%5D%2C%5B216%2C238%2C233%2C255%5D%5D%2C%5B%5B-5.742%2C-4.891%5D%2C%5B224%2C240%2C235%2C255%5D%5D%2C%5B%5B-4.891%2C-4.049%5D%2C%5B232%2C242%2C237%2C255%5D%5D%2C%5B%5B-4.049%2C-3.298%5D%2C%5B240%2C244%2C239%2C255%5D%5D%2C%5B%5B-3.298%2C-2.598%5D%2C%5B245%2C244%2C237%2C255%5D%5D%2C%5B%5B-2.598%2C-2.0%5D%2C%5B245%2C242%2C229%2C255%5D%5D%2C%5B%5B-2.0%2C2.0%5D%2C%5B245%2C240%2C221%2C255%5D%5D%2C%5B%5B2.0%2C2.598%5D%2C%5B246%2C237%2C214%2C255%5D%5D%2C%5B%5B2.598%2C3.298%5D%2C%5B246%2C235%2C206%2C255%5D%5D%2C%5B%5B3.298%2C4.049%5D%2C%5B246%2C233%2C198%2C255%5D%5D%2C%5B%5B4.049%2C4.891%5D%2C%5B243%2C228%2C187%2C255%5D%5D%2C%5B%5B4.891%2C5.742%5D%2C%5B239%2C221%2C175%2C255%5D%5D%2C%5B%5B5.742%2C6.679%5D%2C%5B235%2C215%2C163%2C255%5D%5D%2C%5B%5B6.679%2C7.66%5D%2C%5B231%2C208%2C151%2C255%5D%5D%2C%5B%5B7.66%2C8.686%5D%2C%5B227%2C201%2C138%2C255%5D%5D%2C%5B%5B8.686%2C9.79%5D%2C%5B223%2C195%2C126%2C255%5D%5D%2C%5B%5B9.79%2C10.935%5D%2C%5B218%2C184%2C112%2C255%5D%5D%2C%5B%5B10.935%2C12.122%5D%2C%5B212%2C172%2C98%2C255%5D%5D%2C%5B%5B12.122%2C13.348%5D%2C%5B207%2C161%2C84%2C255%5D%5D%2C%5B%5B13.348%2C14.646%5D%2C%5B201%2C150%2C70%2C255%5D%5D%2C%5B%5B14.646%2C15.951%5D%2C%5B196%2C138%2C56%2C255%5D%5D%2C%5B%5B15.951%2C17.326%5D%2C%5B189%2C127%2C44%2C255%5D%5D%2C%5B%5B17.326%2C18.767%5D%2C%5B180%2C119%2C38%2C255%5D%5D%2C%5B%5B18.767%2C20.215%5D%2C%5B172%2C111%2C32%2C255%5D%5D%2C%5B%5B20.215%2C21.729%5D%2C%5B163%2C102%2C26%2C255%5D%5D%2C%5B%5B21.729%2C23.278%5D%2C%5B154%2C94%2C19%2C255%5D%5D%2C%5B%5B23.278%2C24.863%5D%2C%5B145%2C86%2C13%2C255%5D%5D%2C%5B%5B24.863%2C26.51%5D%2C%5B136%2C79%2C10%2C255%5D%5D%2C%5B%5B26.51%2C28.163%5D%2C%5B128%2C75%2C11%2C255%5D%5D%2C%5B%5B28.163%2C29.878%5D%2C%5B119%2C71%2C11%2C255%5D%5D%2C%5B%5B29.878%2C31.626%5D%2C%5B111%2C67%2C12%2C255%5D%5D%2C%5B%5B31.626%2C33.434%5D%2C%5B103%2C63%2C12%2C255%5D%5D%2C%5B%5B33.434%2C35.274%5D%2C%5B94%2C59%2C13%2C255%5D%5D%2C%5B%5B35.274%2C37.12%5D%2C%5B88%2C56%2C12%2C255%5D%5D%2C%5B%5B37.12%2C39.05%5D%2C%5B83%2C53%2C11%2C255%5D%5D%2C%5B%5B39.05%2C40.985%5D%2C%5B77%2C49%2C10%2C255%5D%5D%2C%5B%5B40.985%2C42.977%5D%2C%5B72%2C46%2C9%2C255%5D%5D%2C%5B%5B42.977%2C45.0%5D%2C%5B66%2C43%2C8%2C255%5D%5D%2C%5B%5B45.0%2C1000%5D%2C%5B61%2C40%2C7%2C255%5D%5D%5D",
        legend: {
          title: "LGMS agriculture net flux (2016-2024 average)",
          type: "divergent",
          color: LGMS_NET_FLUX_COLOR,
          items: LGMS_NET_FLUX_ITEMS,
          info: "This layer maps the average annual net greenhouse-gas flux from agriculture (cropland and livestock emissions) from 2016-2024, showing where agricultural land is acting as a net carbon source.",
          note: "Average 2016-2024 agriculture net flux at the administrative-area level.",
          unit: "Mg CO2e/ha/yr",
        },
      },
    ],
    legend: {
      title: "LGMS net flux (2016-2024 average)",
      type: "divergent",
      color: LGMS_NET_FLUX_COLOR,
      items: LGMS_NET_FLUX_ITEMS,
      info: "This dataset maps the average annual net greenhouse-gas flux from land (2016-2024), combining vegetation, soil, and agricultural emissions and removals, to show where land is acting as a net carbon source or sink.",
      note: "Average 2016-2024 net flux at the administrative-area level.",
      unit: "Mg CO2e/ha/yr",
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
    layers,
    data_layer,
    threshold,
  }) => ({
    ...DEFAULT_DATASET_FIELDS,
    dataset_id,
    dataset_name,
    description,
    reason: description, // for compatibility with LayerCardItem
    data_layer: (data_layer ?? DEFAULT_DATASET_FIELDS.data_layer) as string,
    // tile_url mirrors layers[0] when the card declares multiple layers, so
    // legacy single-tile_url readers still see a sensible default.
    tile_url: (layers?.[0]?.tile_url ??
      tile_url ??
      DEFAULT_DATASET_FIELDS.tile_url) as string,
    layers: layers?.map(({ name, tile_url: url }) => ({
      name,
      tile_url: url,
    })),
    context_layer: (context_layer ?? DEFAULT_DATASET_FIELDS.context_layer) as
      | string
      | null,
    threshold: (threshold ?? DEFAULT_DATASET_FIELDS.threshold) as number | null,
  })
);

export const DATASET_BY_ID: Record<number, DatasetInfo> = Object.fromEntries(
  DATASETS.map((d) => [d.dataset_id, d])
);

// Full dataset_name -> short label, for the datasets that define one. Keyed by
// name (not id) because the only handle available at chip-build time is the
// name string (dataset.dataset_name or a layer's layerName).
const DATASET_SHORTNAME_BY_NAME: Record<string, string> = Object.fromEntries(
  DATASET_CARDS.filter((c) => c.shortName).map((c) => [
    c.dataset_name,
    c.shortName as string,
  ])
);

/**
 * Returns the short label for a dataset name when one is defined, otherwise the
 * original name unchanged. Long unmapped names still truncate at the chip.
 */
export function shortDatasetName(name: string): string {
  return DATASET_SHORTNAME_BY_NAME[name] ?? name;
}

// Datasets with no analytics endpoint — they can be shown on the map but never
// analysed, so the analysis CTAs must skip them.
const VIEW_ONLY_DATASET_IDS: ReadonlySet<number> = new Set(
  DATASET_CARDS.filter((c) => c.viewOnly).map((c) => c.dataset_id)
);

/** Whether a dataset is contextual-only (badged VIEW ONLY, not analysable). */
export function isViewOnlyDataset(datasetId: number): boolean {
  return VIEW_ONLY_DATASET_IDS.has(datasetId);
}
