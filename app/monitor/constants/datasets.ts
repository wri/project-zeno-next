// ---------------------------------------------------------------------------
// Constants for the Dashboard Monitoring page.
// ---------------------------------------------------------------------------

import type { DetectedChartType } from "../types/stream";

// ---------------------------------------------------------------------------
// Dataset catalogue (matches backend IDs 0-9)
// ---------------------------------------------------------------------------

export const DATASETS: Record<number, string> = {
  0: "Global all ecosystem disturbance alerts (DIST-ALERT)",
  1: "Global land cover",
  2: "Global natural/semi-natural grassland extent",
  3: "SBTN Natural Lands Map",
  4: "Tree cover loss",
  5: "Tree cover gain",
  6: "Forest greenhouse gas net flux",
  7: "Tree cover",
  8: "Tree cover loss by dominant driver",
  9: "Deforestation (sLUC) Emission Factors by Agricultural Crop",
};

// ---------------------------------------------------------------------------
// Dataset topics for grouped selection in the wizard
// ---------------------------------------------------------------------------

export interface DatasetTopic {
  label: string;
  description: string;
  datasetIds: number[];
}

export const DATASET_TOPICS: DatasetTopic[] = [
  {
    label: "Forests",
    description: "Tree cover, loss, gain, and loss drivers",
    datasetIds: [4, 5, 7, 8],
  },
  {
    label: "Land Cover",
    description: "Global land cover composition and natural lands",
    datasetIds: [1, 3],
  },
  {
    label: "Grasslands",
    description: "Natural and semi-natural grassland extent",
    datasetIds: [2],
  },
  {
    label: "Emissions & Carbon",
    description: "Greenhouse gas flux and deforestation emission factors",
    datasetIds: [6, 9],
  },
  {
    label: "Alerts",
    description: "Ecosystem disturbance alerts",
    datasetIds: [0],
  },
];

// ---------------------------------------------------------------------------
// Per-dataset metadata (from analytics_datasets.yml)
// ---------------------------------------------------------------------------

export interface DatasetMeta {
  /** Earliest available data date (ISO string). */
  startDate: string;
  /** Latest available data date (ISO string), or null for open-ended. */
  endDate: string | null;
  /** If true, dates are fixed and should not be user-editable. */
  fixedDate: boolean;
  /** Preferred per-area chart type (single-area view). */
  perAreaChartType: DetectedChartType;
  /** Short notes on chart usage from prompt_instructions. */
  chartNotes: string;
}

export const DATASET_META: Record<number, DatasetMeta> = {
  0: {
    startDate: "2023-12-01",
    endDate: null,
    fixedDate: false,
    perAreaChartType: "bar",
    chartNotes:
      "Line for trends, pie for distribution by driver/land cover, grouped-bar for month × class.",
  },
  1: {
    startDate: "2015-01-01",
    endDate: "2024-12-31",
    fixedDate: false,
    perAreaChartType: "pie",
    chartNotes:
      "Pie for composition by land cover class (2024 only). Tables for transitions.",
  },
  2: {
    startDate: "2000-01-01",
    endDate: "2022-12-31",
    fixedDate: false,
    perAreaChartType: "bar",
    chartNotes:
      "Bar or line for area over time. Pie to compare across ≤8 geographies.",
  },
  3: {
    startDate: "2020-01-01",
    endDate: "2020-12-31",
    fixedDate: true,
    perAreaChartType: "pie",
    chartNotes:
      "Bar or pie for natural vs non-natural proportions. Single year only (2020).",
  },
  4: {
    startDate: "2001-01-01",
    endDate: "2024-12-31",
    fixedDate: false,
    perAreaChartType: "bar",
    chartNotes:
      "Bar for yearly loss. Separate charts for area_ha and emissions — never combined.",
  },
  5: {
    startDate: "2000-01-01",
    endDate: "2020-12-31",
    fixedDate: false,
    perAreaChartType: "bar",
    chartNotes: "Bar showing gain area per period.",
  },
  6: {
    startDate: "2001-01-01",
    endDate: "2024-12-31",
    fixedDate: true,
    perAreaChartType: "bar",
    chartNotes:
      "Split bar (emissions +, removals −). NO timeseries — total over 2001-2024.",
  },
  7: {
    startDate: "2000-01-01",
    endDate: "2000-12-31",
    fixedDate: true,
    perAreaChartType: "bar",
    chartNotes: "Bar or pie for binned % tree cover extent. Year 2000 only.",
  },
  8: {
    startDate: "2001-01-01",
    endDate: "2024-12-31",
    fixedDate: true,
    perAreaChartType: "pie",
    chartNotes:
      "Pie or table by driver class. NO timeseries — total over 2001-2024.",
  },
  9: {
    startDate: "2020-01-01",
    endDate: "2024-12-31",
    fixedDate: true,
    perAreaChartType: "bar",
    chartNotes:
      "Pie for emissions by gas type. Bar for changes over time. Tables for comparisons.",
  },
};

// ---------------------------------------------------------------------------
// Streaming limits
// ---------------------------------------------------------------------------

export const MAX_CONCURRENT_STREAMS = 4;
export const STREAM_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// Chart configuration overrides for known datasets
// ---------------------------------------------------------------------------

export interface DatasetChartOverride {
  type: DetectedChartType;
  xAxis: string;
  yAxis: string;
  colorField?: string;
  reshapeMode?: "pivot-long" | "metric-only";
  pivotColumns?: string[];
}

export const DATASET_CHART_OVERRIDES: Record<number, DatasetChartOverride> = {
  0: { type: "bar", xAxis: "dist_alert_date", yAxis: "area_ha" },
  1: { type: "pie", xAxis: "land_cover_class", yAxis: "area_ha" },
  2: { type: "line", xAxis: "year", yAxis: "area_ha" },
  3: { type: "pie", xAxis: "land_type", yAxis: "area_ha" },
  4: { type: "bar", xAxis: "tree_cover_loss_year", yAxis: "area_ha" },
  5: { type: "bar", xAxis: "tree_cover_gain_period", yAxis: "area_ha" },
  6: {
    type: "grouped-bar",
    xAxis: "metric",
    yAxis: "value",
    reshapeMode: "pivot-long",
    pivotColumns: [
      "carbon_net_flux_Mg_CO2e",
      "carbon_gross_emissions_Mg_CO2e",
      "carbon_gross_removals_Mg_CO2e",
    ],
  },
  7: {
    type: "bar",
    xAxis: "area_ha",
    yAxis: "area_ha",
    reshapeMode: "metric-only",
  },
  8: { type: "pie", xAxis: "tree_cover_loss_driver", yAxis: "area_ha" },
  9: {
    type: "grouped-bar",
    xAxis: "crop_type",
    yAxis: "emissions_tCO2e",
    colorField: "gas_type",
  },
};

// ---------------------------------------------------------------------------
// Column name patterns used by auto-detection
// ---------------------------------------------------------------------------

export const TIME_COLUMN_PATTERNS = [
  "year",
  "date",
  "alert_date",
  "dist_alert_date",
  "tree_cover_loss_year",
  "tree_cover_gain_period",
  "period",
  "month",
] as const;

export const KNOWN_CATEGORICAL_COLUMNS = [
  "land_cover_type",
  "land_cover_class",
  "land_cover_class_start",
  "land_cover_class_end",
  "land_type",
  "driver",
  "tree_cover_loss_driver",
  "crop_type",
  "gas_type",
] as const;
