import { DatasetInfo } from "@/app/types/chat";

// UI card config that may omit some DatasetInfo fields; we'll fill defaults
export type DatasetCardConfig = {
  dataset_id: number;
  dataset_name: string;
  reason: string;
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
    data_layer: "Ecosystem disturbance alerts",
    context_layer: null as string | null,
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/BlankMap-World-1942.11.png/330px-BlankMap-World-1942.11.png",
    reason:
      'This dataset provides near-real-time alerts of vegetation disturbance at 30-meter resolution from January 2023 to present, which covers both 2023 and 2024 timeframes needed to compare alert frequencies. It\'s specifically designed to track disturbance events that would generate "alerts" as mentioned in the query.',
    tile_url:
      "https://tiles.globalforestwatch.org/umd_glad_dist_alerts/latest/dynamic/{z}/{x}/{y}.png?render_type=true_color",
    legend: {
      title: "Global all ecosystem disturbance alerts (DIST-ALERT)",
      color: "#f69",
      symbology: {
        items: [
          { label: "Disturbance Alert", color: "#f69" },
        ],
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
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/BlankMap-World-1942.11.png/330px-BlankMap-World-1942.11.png",
    reason:
      "This dataset includes built-up land as one of its land cover classes, which directly corresponds to urban areas. It provides global coverage with annual data from 2015-2024, making it the most appropriate dataset to answer questions about urban area extent worldwide.",
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
    dataset_name: "Global Grasslands",
    context_layer: null as string | null,
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/BlankMap-World-1942.11.png/330px-BlankMap-World-1942.11.png",
    reason:
      "This dataset provides global coverage with annual data from 2015-2024, making it the most appropriate dataset to answer questions about grassland area extent worldwide.",
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
    dataset_name: "SNBT Natural lands",
    context_layer: null as string | null,
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/BlankMap-World-1942.11.png/330px-BlankMap-World-1942.11.png",
    reason:
      'The Natural lands dataset is the best match because it provides a 2020 baseline map of natural vs non-natural land covers at 30m resolution, which can be used to identify intact/natural landscapes. This dataset specifically defines "natural" ecosystems as those that substantially resemble what would be found without major human impacts, making it ideal for assessing landscape intactness across Canadian provinces.',
    tile_url: "",
    legend: {
      title: "SBTN Natural lands (2020)",
      color: "#A8DCB5",
      symbology: {
        items: [
          {label: "natural forests", color: "#246E24"},       
          {label: "natural short vegetation", color: "#B9B91E"},
          {label: "natural water", color: "#6BAED6"},
          {label: "mangroves", color: "#06A285"},
          {label: "bare", color: "#FEFECC"},
          {label: "snow", color: "#ACD1E8"},
          {label: "wet natural forests", color: "#589558"},
          {label: "natural peat forests", color: "#093D09"},
          {label: "wet natural short vegetation", color: "#DBDB7B"},
          {label: "natural peat short vegetation", color: "#99991A"},
          {label: "crop", color: "#D3D3D3"},
          {label: "built", color: "#D3D3D3"},
          {label: "non-natural tree cover", color: "#D3D3D3"},
          {label: "non-natural short vegetation", color: "#D3D3D3"},
          {label: "non-natural water", color: "#D3D3D3"},
          {label: "wet non-natural tree cover", color: "#D3D3D3"},
          {label: "non-natural peat tree cover", color: "#D3D3D3"},
          {label: "wet non-natural short vegetation", color: "#D3D3D3"},
          {label: "non-natural peat short vegetation", color: "#D3D3D3"},
          {label: "non-natural bare", color: "#D3D3D3"}
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
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/BlankMap-World-1942.11.png/330px-BlankMap-World-1942.11.png",
    reason:
      "Tree cover loss dataset can detect stand-replacement disturbances including plantations and supports monitoring forestry practices. The driver context layer would help distinguish harvesting from other causes of tree loss, making it ideal for tracking plantation harvesting cycles.",
    tile_url:
      "https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png?start_year=2001&end_year=2024&tree_cover_density_threshold=25&render_type=true_color",
    legend: {
      title: "Tree cover loss (2001-2024)",
      color: "#f69",
      symbology: {
        items: [
          { label: "Tree cover loss", color: "#f69" },
        ],
      },
      type: "simple",
      info: "Tree cover loss dataset can detect stand-replacement disturbances including plantations and supports monitoring forestry practices. The driver context layer would help distinguish harvesting from other causes of tree loss, making it ideal for tracking plantation harvesting cycles.",
      note: "This is a placeholder note.",
    },
  },
];

// Defaults applied to DatasetInfo when not provided by cards
const DEFAULT_DATASET_FIELDS: Omit<
  DatasetInfo,
  "dataset_id" | "dataset_name" | "reason"
> = {
  source: "",
  data_layer: "",
  tile_url: "",
  context_layer: "",
  threshold: null,
};

export const DATASETS: DatasetInfo[] = DATASET_CARDS.map(
  ({
    dataset_id,
    dataset_name,
    context_layer,
    reason,
    tile_url,
    data_layer,
    threshold,
  }) => ({
    ...DEFAULT_DATASET_FIELDS,
    dataset_id,
    dataset_name,
    reason,
    data_layer: data_layer ?? DEFAULT_DATASET_FIELDS.data_layer,
    tile_url: tile_url ?? DEFAULT_DATASET_FIELDS.tile_url,
    context_layer: (context_layer ??
      DEFAULT_DATASET_FIELDS.context_layer) as string,
    threshold: threshold ?? DEFAULT_DATASET_FIELDS.threshold,
  })
);

export const DATASET_BY_ID: Record<number, DatasetInfo> = Object.fromEntries(
  DATASETS.map((d) => [d.dataset_id, d])
);
