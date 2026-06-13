import type { ChartType } from "@/app/types/portfolio";

// ---------------------------------------------------------------------------
// Templated insights — fixture-only V1.
//
// Mirrors the dataset catalogue from the report-builder-final monitor flow
// but trades streamed analytics for hand-authored seed data. Each template
// renders the same numbers regardless of which dashboard's AOI is in play;
// the dashboard page appends the AOI name to the title when the template
// is materialised so the resulting insight still reads as scoped to that
// area.
// ---------------------------------------------------------------------------

export type InsightTopic =
  | "Forests"
  | "Land Cover"
  | "Grasslands"
  | "Emissions & Carbon"
  | "Alerts";

export interface InsightTemplate {
  id: string;
  topic: InsightTopic;
  title: string;
  // Short, human-readable one-liner shown under the title on the side-pane
  // card. Should complement the title rather than echo the dataset name.
  subtitle: string;
  description: string;
  datasetName: string;
  chartType: ChartType;
  data: Record<string, string | number>[];
  xAxis: string;
  yAxis: string;
}

export const INSIGHT_TEMPLATES: InsightTemplate[] = [
  // ── Forests ─────────────────────────────────────────────────────────
  {
    id: "tcl-yearly",
    topic: "Forests",
    title: "Annual Tree cover loss",
    subtitle: "Yearly loss trajectory",
    description:
      "Annual Hansen tree cover loss in hectares. Bars for each year give a quick read on the loss trajectory across the last decade.",
    datasetName: "Tree cover loss",
    chartType: "bar",
    xAxis: "year",
    yAxis: "loss_ha",
    data: [
      { year: 2015, loss_ha: 18400 },
      { year: 2016, loss_ha: 22100 },
      { year: 2017, loss_ha: 19800 },
      { year: 2018, loss_ha: 24200 },
      { year: 2019, loss_ha: 27600 },
      { year: 2020, loss_ha: 31200 },
      { year: 2021, loss_ha: 28900 },
      { year: 2022, loss_ha: 33400 },
      { year: 2023, loss_ha: 37100 },
      { year: 2024, loss_ha: 40500 },
    ],
  },
  {
    id: "tree-cover-gain",
    topic: "Forests",
    title: "Tree cover gain — 5-year periods",
    subtitle: "Area regained per window",
    description:
      "Hectares of tree cover gain aggregated into five-year windows from 2000 to 2020. Bar height reads as the area regained in that window.",
    datasetName: "Tree cover gain",
    chartType: "bar",
    xAxis: "period",
    yAxis: "gain_ha",
    data: [
      { period: "2000–2005", gain_ha: 8200 },
      { period: "2005–2010", gain_ha: 10400 },
      { period: "2010–2015", gain_ha: 12100 },
      { period: "2015–2020", gain_ha: 14800 },
    ],
  },
  {
    id: "tree-cover-extent-2000",
    topic: "Forests",
    title: "Tree cover extent (year 2000)",
    subtitle: "Canopy density baseline",
    description:
      "Area binned by canopy density at the year-2000 baseline. Bars by 25% bins show how much of the area is densely forested versus sparse.",
    datasetName: "Tree cover",
    chartType: "bar",
    xAxis: "cover_band",
    yAxis: "area_ha",
    data: [
      { cover_band: "0–25%", area_ha: 142000 },
      { cover_band: "25–50%", area_ha: 268000 },
      { cover_band: "50–75%", area_ha: 410000 },
      { cover_band: "75–100%", area_ha: 1080000 },
    ],
  },
  {
    id: "tcl-by-driver",
    topic: "Forests",
    title: "Tree cover loss by dominant driver",
    subtitle: "What's driving the loss",
    description:
      "Total tree cover loss between 2001 and 2024 attributed to its dominant driver. Useful for seeing what's responsible for most of the loss in the area.",
    datasetName: "Tree cover loss by dominant driver",
    chartType: "pie",
    xAxis: "driver",
    yAxis: "share_pct",
    data: [
      { driver: "Commodity-driven deforestation", share_pct: 38 },
      { driver: "Shifting agriculture", share_pct: 24 },
      { driver: "Forestry", share_pct: 18 },
      { driver: "Wildfire", share_pct: 12 },
      { driver: "Urbanization", share_pct: 5 },
      { driver: "Unknown", share_pct: 3 },
    ],
  },

  // ── Land Cover ──────────────────────────────────────────────────────
  {
    id: "land-cover-composition",
    topic: "Land Cover",
    title: "Land cover composition (2024)",
    subtitle: "Mix of cover classes",
    description:
      "Share of the area covered by each land-cover class in the latest available year. A quick snapshot of how mixed the landscape is.",
    datasetName: "Global land cover",
    chartType: "pie",
    xAxis: "class",
    yAxis: "share_pct",
    data: [
      { class: "Forest", share_pct: 48 },
      { class: "Cropland", share_pct: 21 },
      { class: "Grassland", share_pct: 14 },
      { class: "Wetland", share_pct: 6 },
      { class: "Built-up", share_pct: 5 },
      { class: "Bare / sparse", share_pct: 4 },
      { class: "Water", share_pct: 2 },
    ],
  },
  {
    id: "sbtn-natural-lands",
    topic: "Land Cover",
    title: "SBTN Natural Lands (2020)",
    subtitle: "Natural vs modified shares",
    description:
      "Share of the area classified as natural vs. modified land per the SBTN Natural Lands Map (year 2020 only). Useful for baselining no-conversion claims.",
    datasetName: "SBTN Natural Lands Map",
    chartType: "pie",
    xAxis: "class",
    yAxis: "share_pct",
    data: [
      { class: "Natural forest", share_pct: 64 },
      { class: "Other natural cover", share_pct: 17 },
      { class: "Modified (non-natural)", share_pct: 19 },
    ],
  },

  // ── Grasslands ──────────────────────────────────────────────────────
  {
    id: "grassland-extent",
    topic: "Grasslands",
    title: "Grassland extent over time",
    subtitle: "Annual area trend",
    description:
      "Total natural and semi-natural grassland area each year. Useful to track whether grasslands are expanding, holding, or losing ground.",
    datasetName: "Natural / semi-natural grasslands",
    chartType: "line",
    xAxis: "year",
    yAxis: "area_ha",
    data: [
      { year: 2015, area_ha: 1_240_000 },
      { year: 2016, area_ha: 1_235_000 },
      { year: 2017, area_ha: 1_228_500 },
      { year: 2018, area_ha: 1_221_800 },
      { year: 2019, area_ha: 1_215_400 },
      { year: 2020, area_ha: 1_207_900 },
      { year: 2021, area_ha: 1_201_100 },
      { year: 2022, area_ha: 1_194_300 },
    ],
  },

  // ── Emissions & Carbon ──────────────────────────────────────────────
  {
    id: "ghg-net-flux",
    topic: "Emissions & Carbon",
    title: "Forest GHG net flux",
    subtitle: "Net source or sink, by year",
    description:
      "Net forest greenhouse-gas flux per year (MtCO₂e). Positive values are emissions, negative values are removals — the balance reveals whether forests in the area are a net source or sink.",
    datasetName: "Forest greenhouse gas net flux",
    chartType: "bar",
    xAxis: "year",
    yAxis: "net_flux_mtco2e",
    data: [
      { year: 2018, net_flux_mtco2e: -6.2 },
      { year: 2019, net_flux_mtco2e: -4.8 },
      { year: 2020, net_flux_mtco2e: 1.3 },
      { year: 2021, net_flux_mtco2e: 3.9 },
      { year: 2022, net_flux_mtco2e: 5.6 },
      { year: 2023, net_flux_mtco2e: 7.1 },
    ],
  },
  {
    id: "sluc-emission-factors",
    topic: "Emissions & Carbon",
    title: "Deforestation emission factors by crop",
    subtitle: "tCO₂e per hectare by commodity",
    description:
      "Average sLUC (statistical land-use change) emission factor per hectare for the major agricultural commodities driving forest loss. Tonnes CO₂e per hectare.",
    datasetName:
      "Deforestation (sLUC) Emission Factors by Agricultural Crop",
    chartType: "bar",
    xAxis: "crop",
    yAxis: "emission_factor_tco2e_ha",
    data: [
      { crop: "Cattle", emission_factor_tco2e_ha: 18.4 },
      { crop: "Soybean", emission_factor_tco2e_ha: 4.2 },
      { crop: "Oil palm", emission_factor_tco2e_ha: 3.8 },
      { crop: "Cocoa", emission_factor_tco2e_ha: 2.9 },
      { crop: "Coffee", emission_factor_tco2e_ha: 2.1 },
      { crop: "Rubber", emission_factor_tco2e_ha: 1.6 },
      { crop: "Sugar", emission_factor_tco2e_ha: 1.2 },
    ],
  },

  // ── Alerts ──────────────────────────────────────────────────────────
  {
    id: "dist-alerts",
    topic: "Alerts",
    title: "Ecosystem disturbance alerts (DIST-ALERT)",
    subtitle: "Weekly detections trend",
    description:
      "Weekly count of DIST-ALERT detections across the area. Spikes typically signal active disturbance events worth investigating.",
    datasetName: "Global all ecosystem disturbance alerts (DIST-ALERT)",
    chartType: "line",
    xAxis: "week",
    yAxis: "alerts",
    data: [
      { week: 1, alerts: 14 },
      { week: 2, alerts: 22 },
      { week: 3, alerts: 19 },
      { week: 4, alerts: 31 },
      { week: 5, alerts: 47 },
      { week: 6, alerts: 38 },
      { week: 7, alerts: 25 },
      { week: 8, alerts: 18 },
      { week: 9, alerts: 29 },
      { week: 10, alerts: 41 },
      { week: 11, alerts: 53 },
      { week: 12, alerts: 44 },
    ],
  },
];

// Topic display order on the side pane. Forests first since it's the
// canonical entry point for most users.
export const INSIGHT_TOPIC_ORDER: InsightTopic[] = [
  "Forests",
  "Land Cover",
  "Grasslands",
  "Emissions & Carbon",
  "Alerts",
];
