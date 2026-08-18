import type { Chart } from "@/src/entities/insight";
import { chartsToWidgets } from "@/src/entities/insight";
import type { AnalysisResult } from "@/src/features/analysis";
import type { InsightWidget } from "@/app/types/chat";
import {
  NET_FLUX_DIVERGENT_COLORS,
  NET_FLUX_FULL_DETAIL_COLOR_MAP,
  NET_FLUX_FULL_DETAIL_FIELDS,
  NET_FLUX_LINE_FIELD,
} from "./net-flux-variants";

/**
 * Land GHG Monitoring System (LGMS) — the annual, category-broken-down net
 * flux dataset this curated insight is built on. Distinct from "Forest
 * greenhouse gas net flux" (dataset 6), whose catalog forbids a time-series
 * presentation (cumulative 2001-2025 total only).
 */
export const LGMS_DATASET_ID = 12;

/**
 * Illustrative annual values in megatonnes CO2e/yr, anchored to the design.
 *
 * The 2020 row reproduces the design's tooltip exactly (+1,600 emissions,
 * −750 removals, +850 net). The 2016 row is read off the design's own plot
 * geometry — its y-axis puts 500 units at 55.56px, giving +1,750 emissions and
 * −700 removals, i.e. the +1,050 headline. 2024 continues that trend to the
 * +610 headline, and the remaining years interpolate linearly between those
 * three anchors, so the rendered axis range matches the design rather than
 * just the endpoints.
 *
 * The two agriculture fields are held constant across every year, per the
 * design's own caption: agriculture is a fixed 2020 value repeated annually,
 * and only land use varies year to year. The design does not specify how the
 * 250 total splits between livestock and cropland management — only the total
 * is taken from it.
 */
const NET_FLUX_DUMMY_ROWS: Record<string, number>[] = [
  {
    year: 2016,
    "Livestock (2020, static)": 150,
    "Cropland management (2020, static)": 100,
    "Organic soil": 420,
    "Mineral soil": 180,
    "Non-trees rem. non-trees": 90,
    "Trees rem. trees": 180,
    "Tree loss": 630,
    "Tree gain": -472,
    "Trees remaining": -126,
    "Non-trees": -32,
    Mineral: -70,
  },
  {
    year: 2017,
    "Livestock (2020, static)": 150,
    "Cropland management (2020, static)": 100,
    "Organic soil": 410,
    "Mineral soil": 176,
    "Non-trees rem. non-trees": 88,
    "Trees rem. trees": 176,
    "Tree loss": 614,
    "Tree gain": -481,
    "Trees remaining": -128,
    "Non-trees": -32,
    Mineral: -71,
  },
  {
    year: 2018,
    "Livestock (2020, static)": 150,
    "Cropland management (2020, static)": 100,
    "Organic soil": 399,
    "Mineral soil": 171,
    "Non-trees rem. non-trees": 86,
    "Trees rem. trees": 171,
    "Tree loss": 599,
    "Tree gain": -490,
    "Trees remaining": -131,
    "Non-trees": -33,
    Mineral: -73,
  },
  {
    year: 2019,
    "Livestock (2020, static)": 150,
    "Cropland management (2020, static)": 100,
    "Organic soil": 389,
    "Mineral soil": 167,
    "Non-trees rem. non-trees": 83,
    "Trees rem. trees": 167,
    "Tree loss": 583,
    "Tree gain": -498,
    "Trees remaining": -133,
    "Non-trees": -33,
    Mineral: -74,
  },
  {
    year: 2020,
    "Livestock (2020, static)": 150,
    "Cropland management (2020, static)": 100,
    "Organic soil": 378,
    "Mineral soil": 162,
    "Non-trees rem. non-trees": 81,
    "Trees rem. trees": 162,
    "Tree loss": 567,
    "Tree gain": -506,
    "Trees remaining": -135,
    "Non-trees": -34,
    Mineral: -75,
  },
  {
    year: 2021,
    "Livestock (2020, static)": 150,
    "Cropland management (2020, static)": 100,
    "Organic soil": 365,
    "Mineral soil": 158,
    "Non-trees rem. non-trees": 79,
    "Trees rem. trees": 158,
    "Tree loss": 553,
    "Tree gain": -521,
    "Trees remaining": -139,
    "Non-trees": -35,
    Mineral: -77,
  },
  {
    year: 2022,
    "Livestock (2020, static)": 150,
    "Cropland management (2020, static)": 100,
    "Organic soil": 352,
    "Mineral soil": 154,
    "Non-trees rem. non-trees": 77,
    "Trees rem. trees": 154,
    "Tree loss": 539,
    "Tree gain": -537,
    "Trees remaining": -143,
    "Non-trees": -36,
    Mineral: -79,
  },
  {
    year: 2023,
    "Livestock (2020, static)": 150,
    "Cropland management (2020, static)": 100,
    "Organic soil": 338,
    "Mineral soil": 150,
    "Non-trees rem. non-trees": 75,
    "Trees rem. trees": 150,
    "Tree loss": 524,
    "Tree gain": -552,
    "Trees remaining": -147,
    "Non-trees": -37,
    Mineral: -82,
  },
  {
    year: 2024,
    "Livestock (2020, static)": 150,
    "Cropland management (2020, static)": 100,
    "Organic soil": 325,
    "Mineral soil": 146,
    "Non-trees rem. non-trees": 73,
    "Trees rem. trees": 146,
    "Tree loss": 510,
    "Tree gain": -567,
    "Trees remaining": -151,
    "Non-trees": -38,
    Mineral: -84,
  },
];

function sumRow(row: Record<string, number>, fields: string[]): number {
  return fields.reduce((sum, field) => sum + (row[field] ?? 0), 0);
}

const NET_FLUX_CHART: Chart = {
  id: "net-flux-lgms-dummy",
  position: 0,
  title: "Net flux over time",
  type: "stacked-bar-with-line",
  xAxis: "year",
  yAxis: "net_flux_mt",
  colorField: "",
  stackField: "category",
  groupField: "",
  seriesFields: NET_FLUX_FULL_DETAIL_FIELDS,
  data: NET_FLUX_DUMMY_ROWS.map((row) => ({
    ...row,
    [NET_FLUX_LINE_FIELD]: sumRow(row, NET_FLUX_FULL_DETAIL_FIELDS),
  })),
  colorMap: NET_FLUX_FULL_DETAIL_COLOR_MAP,
  divergentColors: NET_FLUX_DIVERGENT_COLORS,
};

/**
 * Canned analysis result for dataset 12 (LGMS), keyed into
 * `DatasetOverrideGateway` until project-zeno ships a real chart generator
 * for it (see the backend shape proposal in the implementation plan).
 */
export const NET_FLUX_DUMMY_RESULT: AnalysisResult = {
  id: "net-flux-dummy-result",
  charts: [NET_FLUX_CHART],
};

/**
 * The dummy result mapped through the real Chart -> InsightWidget ACL, for
 * `/chart-debug` and tests — so it exercises the same mapping real data will.
 * `lineField` isn't part of the `Chart` entity (it's a net-flux-specific
 * rendering hint, not a general insight concept), so it's set here rather
 * than threaded through `chartsToWidgets`.
 */
export const NET_FLUX_DUMMY_WIDGET: InsightWidget = {
  ...chartsToWidgets(NET_FLUX_DUMMY_RESULT.charts)[0],
  lineField: NET_FLUX_LINE_FIELD,
};
