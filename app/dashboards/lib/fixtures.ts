import type { InsightWidget, InsightGeneration } from "@/app/types/chat";
import type { Dashboard, DashboardWidget } from "@/app/types/dashboard";

// ---------------------------------------------------------------------------
// Dashboards prototype — fixture data
//
// Widget fixtures are lifted from /chart-debug so the prototype renders with
// the same representative shapes the production WidgetMessage already handles.
// All data is fake. Nothing here touches the backend.
// ---------------------------------------------------------------------------

/** SSR-safe base64 (btoa is unavailable during server render). */
function b64(str: string): string {
  if (typeof window !== "undefined") return btoa(str);
  return Buffer.from(str).toString("base64");
}

const FAKE_GENERATION: InsightGeneration = {
  codeact_parts: [
    {
      type: "text_output",
      content: b64(
        "## Analysis plan\n\nQuery the dataset for the selected area of interest, aggregate by year, then visualise the result."
      ),
    },
    {
      type: "code_block",
      content: b64(
        `import pandas as pd\nfrom lcl_api import query_dataset\n\ndf = query_dataset(dataset="tree_cover_loss", aoi="BRA.18", start_year=2018, end_year=2023)\nresult = df.groupby("year")["area_ha"].sum().reset_index()\nprint(result)`
      ),
    },
    {
      type: "execution_output",
      content: b64(
        "   year   area_ha\n0  2018  41200\n1  2019  38400\n2  2020  35900\n3  2021  29800\n4  2022  27300\n5  2023  24100"
      ),
    },
  ],
  source_urls: ["https://data.globalforestwatch.org/datasets/tree-cover-loss"],
};

// ---------------------------------------------------------------------------
// Reusable insight widgets
// ---------------------------------------------------------------------------

const TREE_COVER_LINE: InsightWidget = {
  type: "line",
  title: "Tree cover loss by year — Paraná, Brazil",
  description:
    "Annual tree cover loss in hectares for the selected area of interest.",
  data: [
    { year: 2018, area_ha: 41200 },
    { year: 2019, area_ha: 38400 },
    { year: 2020, area_ha: 35900 },
    { year: 2021, area_ha: 29800 },
    { year: 2022, area_ha: 27300 },
    { year: 2023, area_ha: 24100 },
  ],
  xAxis: "year",
  yAxis: "area_ha",
  datasetName: "Tree cover loss",
  generation: FAKE_GENERATION,
  analysisParams: {
    areas: ["Paraná, Brazil"],
    dataset: "Tree cover loss",
    canopyThreshold: 30,
    startYear: 2018,
    endYear: 2023,
  },
};

const EMISSIONS_LINE: InsightWidget = {
  type: "line",
  title: "Carbon emissions from land use (2015–2023)",
  description:
    "Annual CO₂ emissions from deforestation and land degradation, in megatonnes.",
  data: [
    { year: 2015, carbon_emissions_mt: 2.1 },
    { year: 2016, carbon_emissions_mt: 2.3 },
    { year: 2017, carbon_emissions_mt: 2.0 },
    { year: 2018, carbon_emissions_mt: 2.5 },
    { year: 2019, carbon_emissions_mt: 2.8 },
    { year: 2020, carbon_emissions_mt: 2.2 },
    { year: 2021, carbon_emissions_mt: 3.1 },
    { year: 2022, carbon_emissions_mt: 3.4 },
    { year: 2023, carbon_emissions_mt: 3.0 },
  ],
  xAxis: "year",
  yAxis: "carbon_emissions_mt",
  generation: FAKE_GENERATION,
  analysisParams: {
    dataset: "Gross emissions from forest biomass loss",
    startYear: 2015,
    endYear: 2023,
  },
};

const DRIVERS_PIE: InsightWidget = {
  type: "pie",
  title: "Main drivers of deforestation",
  description: "Area of forest loss attributed to each driver category.",
  data: [
    { driver: "Logging", area_ha: 3400000 },
    { driver: "Shifting cultivation", area_ha: 2800000 },
    { driver: "Wildfire", area_ha: 1900000 },
    { driver: "Permanent agriculture", area_ha: 1500000 },
    { driver: "Settlements & Infrastructure", area_ha: 600000 },
    { driver: "Hard commodities", area_ha: 350000 },
  ],
  xAxis: "driver",
  yAxis: "area_ha",
  generation: FAKE_GENERATION,
  analysisParams: {
    dataset: "Tree cover loss by dominant driver",
    canopyThreshold: 30,
    startYear: 2001,
    endYear: 2023,
  },
};

const TCL_TABLE: InsightWidget = {
  type: "table",
  title: "Top regions by tree cover loss",
  description: "Ranked list of regions with the highest tree cover loss.",
  data: [
    {
      rank: 1,
      region: "Paraná",
      tree_cover_loss_ha: 41200,
      pct_of_total: 18.4,
    },
    {
      rank: 2,
      region: "Mato Grosso",
      tree_cover_loss_ha: 38900,
      pct_of_total: 17.3,
    },
    { rank: 3, region: "Pará", tree_cover_loss_ha: 33100, pct_of_total: 14.8 },
    {
      rank: 4,
      region: "Rondônia",
      tree_cover_loss_ha: 28700,
      pct_of_total: 12.8,
    },
    {
      rank: 5,
      region: "Amazonas",
      tree_cover_loss_ha: 22400,
      pct_of_total: 10.0,
    },
  ] as unknown as InsightWidget["data"],
  xAxis: "",
  yAxis: "",
  analysisParams: {
    dataset: "Tree cover loss",
    canopyThreshold: 30,
    startYear: 2001,
    endYear: 2023,
  },
};

const TCL_BAR: InsightWidget = {
  type: "bar",
  title: "Tree cover loss by country (2023)",
  description: "Top countries by tree cover loss in hectares during 2023.",
  data: [
    { country: "Brazil", tree_cover_loss_ha: 4812000 },
    { country: "Indonesia", tree_cover_loss_ha: 2610000 },
    { country: "DR Congo", tree_cover_loss_ha: 1100000 },
    { country: "Bolivia", tree_cover_loss_ha: 590000 },
    { country: "Malaysia", tree_cover_loss_ha: 475000 },
  ],
  xAxis: "country",
  yAxis: "tree_cover_loss_ha",
  datasetName: "Tree cover loss",
  generation: FAKE_GENERATION,
  analysisParams: {
    dataset: "Tree cover loss",
    canopyThreshold: 30,
    startYear: 2023,
    endYear: 2023,
  },
};

const LAND_COVER_PIE: InsightWidget = {
  type: "pie",
  title: "Land cover composition",
  description: "Share of land cover types by area.",
  data: [
    { land_cover_type: "Tree cover", area_km2: 42000 },
    { land_cover_type: "Cropland", area_km2: 18500 },
    { land_cover_type: "Grassland", area_km2: 12300 },
    { land_cover_type: "Water", area_km2: 5400 },
    { land_cover_type: "Built-up", area_km2: 1800 },
    { land_cover_type: "Bare / sparse", area_km2: 3200 },
  ],
  xAxis: "land_cover_type",
  yAxis: "area_km2",
  generation: FAKE_GENERATION,
  analysisParams: {
    dataset: "Land cover",
    startYear: 2023,
    endYear: 2023,
  },
};

const GHG_FLUX_BAR: InsightWidget = {
  type: "bar",
  title: "Forest greenhouse gas net flux by year",
  description:
    "Net GHG flux in MtCO₂e — negative values are sinks, positive are sources.",
  data: [
    { year: 2018, net_flux_mtco2e: -120 },
    { year: 2019, net_flux_mtco2e: -90 },
    { year: 2020, net_flux_mtco2e: -40 },
    { year: 2021, net_flux_mtco2e: 30 },
    { year: 2022, net_flux_mtco2e: 60 },
    { year: 2023, net_flux_mtco2e: 20 },
  ],
  xAxis: "year",
  yAxis: "net_flux_mtco2e",
  datasetName: "Forest greenhouse gas net flux (2001-2024)",
  generation: FAKE_GENERATION,
  analysisParams: {
    dataset: "Forest greenhouse gas net flux (2001-2024)",
    startYear: 2018,
    endYear: 2023,
  },
};

const TREE_GAIN_AREA: InsightWidget = {
  type: "area",
  title: "Tree cover gain over time",
  description: "Cumulative tree cover gain in hectares.",
  data: [
    { year: 2015, gain_ha: 1200 },
    { year: 2016, gain_ha: 2600 },
    { year: 2017, gain_ha: 4100 },
    { year: 2018, gain_ha: 5800 },
    { year: 2019, gain_ha: 7300 },
    { year: 2020, gain_ha: 9100 },
    { year: 2021, gain_ha: 10800 },
    { year: 2022, gain_ha: 12600 },
    { year: 2023, gain_ha: 14200 },
  ],
  xAxis: "year",
  yAxis: "gain_ha",
  datasetName: "Tree cover gain",
  generation: FAKE_GENERATION,
  analysisParams: {
    dataset: "Tree cover gain",
    canopyThreshold: 30,
    startYear: 2015,
    endYear: 2023,
  },
};

const FIRE_ALERTS_LINE: InsightWidget = {
  type: "line",
  title: "Fire alerts by month",
  description: "VIIRS fire alerts detected per month.",
  data: [
    { month: "Jan", alerts: 120 },
    { month: "Feb", alerts: 90 },
    { month: "Mar", alerts: 140 },
    { month: "Apr", alerts: 210 },
    { month: "May", alerts: 320 },
    { month: "Jun", alerts: 480 },
    { month: "Jul", alerts: 610 },
    { month: "Aug", alerts: 540 },
    { month: "Sep", alerts: 300 },
  ],
  xAxis: "month",
  yAxis: "alerts",
  datasetName: "VIIRS fire alerts",
  generation: FAKE_GENERATION,
  analysisParams: {
    dataset: "VIIRS fire alerts",
    startYear: 2024,
    endYear: 2024,
  },
};

const GRASSLAND_AREA: InsightWidget = {
  type: "area",
  title: "Natural grassland extent",
  description: "Natural / semi-natural grassland extent in km².",
  data: [
    { year: 2018, extent_km2: 8200 },
    { year: 2019, extent_km2: 8050 },
    { year: 2020, extent_km2: 7900 },
    { year: 2021, extent_km2: 7720 },
    { year: 2022, extent_km2: 7510 },
    { year: 2023, extent_km2: 7330 },
  ],
  xAxis: "year",
  yAxis: "extent_km2",
  datasetName: "Grasslands",
  generation: FAKE_GENERATION,
  analysisParams: {
    dataset: "Grasslands",
    startYear: 2018,
    endYear: 2023,
  },
};

const BIODIVERSITY_BAR: InsightWidget = {
  type: "bar",
  title: "Species richness by key biodiversity area",
  description: "Estimated species richness across nearby KBAs.",
  data: [
    { kba: "Serra do Mar", species: 1240 },
    { kba: "Iguaçu", species: 1080 },
    { kba: "Ilha do Mel", species: 760 },
    { kba: "Campos Gerais", species: 540 },
    { kba: "Guaraqueçaba", species: 1320 },
  ],
  xAxis: "kba",
  yAxis: "species",
  datasetName: "Key Biodiversity Areas",
  generation: FAKE_GENERATION,
  analysisParams: {
    dataset: "Key Biodiversity Areas",
  },
};

/** Named widget fixtures the canned engine can clone into a dashboard. */
export const WIDGET_FIXTURES = {
  treeCoverLine: TREE_COVER_LINE,
  emissionsLine: EMISSIONS_LINE,
  driversPie: DRIVERS_PIE,
  tclTable: TCL_TABLE,
  tclBar: TCL_BAR,
  landCoverPie: LAND_COVER_PIE,
  ghgFluxBar: GHG_FLUX_BAR,
  treeGainArea: TREE_GAIN_AREA,
  fireAlertsLine: FIRE_ALERTS_LINE,
  grasslandArea: GRASSLAND_AREA,
  biodiversityBar: BIODIVERSITY_BAR,
} as const;

export type WidgetFixtureKey = keyof typeof WIDGET_FIXTURES;

// ---------------------------------------------------------------------------
// Example AI-generated insights — stand in for analyses produced in the map
// chat (insightStore) so a standalone /dashboards visit still has generated
// insights to browse. Distinct titles from the verified library.
// ---------------------------------------------------------------------------

export const AI_EXAMPLE_INSIGHTS: InsightWidget[] = [
  {
    type: "line",
    title: "Tree cover loss spike in 2023 — Paraná",
    description: "Annual tree cover loss with a sharp uptick in 2023.",
    data: [
      { year: 2019, area_ha: 38400 },
      { year: 2020, area_ha: 35900 },
      { year: 2021, area_ha: 29800 },
      { year: 2022, area_ha: 27300 },
      { year: 2023, area_ha: 41000 },
    ],
    xAxis: "year",
    yAxis: "area_ha",
    datasetName: "Tree cover loss",
    generation: FAKE_GENERATION,
    analysisParams: {
      areas: ["Paraná, Brazil"],
      dataset: "Tree cover loss",
      canopyThreshold: 30,
      startYear: 2019,
      endYear: 2023,
    },
  },
  {
    type: "bar",
    title: "Emissions vs. previous 3-year average",
    description: "Recent land-use emissions compared to the prior average.",
    data: [
      { period: "2021", mtco2e: 3.1 },
      { period: "2022", mtco2e: 3.4 },
      { period: "2023", mtco2e: 3.0 },
      { period: "3-yr avg", mtco2e: 2.6 },
    ],
    xAxis: "period",
    yAxis: "mtco2e",
    generation: FAKE_GENERATION,
    analysisParams: {
      dataset: "Gross emissions from forest biomass loss",
      startYear: 2021,
      endYear: 2023,
    },
  },
  {
    type: "bar",
    title: "Top disturbance-alert clusters this month",
    description: "Where recent disturbance alerts are concentrating.",
    data: [
      { cluster: "Western frontier", alerts: 120 },
      { cluster: "River basin", alerts: 86 },
      { cluster: "Northern ridge", alerts: 54 },
      { cluster: "Southern edge", alerts: 33 },
    ],
    xAxis: "cluster",
    yAxis: "alerts",
    generation: FAKE_GENERATION,
    analysisParams: {
      dataset: "Global all ecosystem disturbance alerts",
    },
  },
];

// ---------------------------------------------------------------------------
// Seed dashboards (match the three cards in the Figma gallery)
// ---------------------------------------------------------------------------

const w = (
  id: string,
  partial: Omit<DashboardWidget, "id">
): DashboardWidget => ({ id, ...partial });

export const DEFAULT_DASHBOARDS: Dashboard[] = [
  {
    id: "parana-brazil",
    title: "Paraná, Brazil",
    subtitle: "Brazil",
    updatedAt: "2026-06-21T09:00:00.000Z",
    badge: "3 new alerts",
    isPublic: true,
    tags: ["Forests", "Alerts"],
    widgets: [
      w("parana-intro", {
        kind: "text",
        span: 1,
        text: "Tree cover loss across Paraná has declined steadily since 2018, but disturbance alerts have ticked up over the last three months — concentrated along the western agricultural frontier. The line chart tracks the long-term trend; the map shows where recent alerts are clustering.",
      }),
      w("parana-line", {
        kind: "insight",
        span: 1,
        verified: true,
        insight: TREE_COVER_LINE,
      }),
      w("parana-map", {
        kind: "map",
        span: 2,
        map: {
          caption: "2021 alerts in Paraná, Brazil — last 3 months",
          alertCount: 240,
          insetTitle: "Global all ecosystem disturbance alerts (2021)",
          center: [-51.5, -24.8],
          zoom: 6,
        },
      }),
    ],
  },
  {
    id: "spain-wildfires",
    title: "Summer of 2025 wildfires in Spain",
    subtitle: "Spain",
    updatedAt: "2026-08-20T09:00:00.000Z",
    tags: ["Wildfire", "Carbon"],
    widgets: [
      w("spain-intro", {
        kind: "text",
        span: 2,
        text: "The 2025 wildfire season in Spain was among the most severe on record. Carbon emissions from land use spiked, and the driver breakdown shows wildfire overtaking other causes of forest loss for the year.",
      }),
      w("spain-emissions", {
        kind: "insight",
        span: 1,
        verified: true,
        insight: EMISSIONS_LINE,
      }),
      w("spain-drivers", {
        kind: "insight",
        span: 1,
        verified: false,
        insight: DRIVERS_PIE,
      }),
    ],
  },
  {
    id: "drc-deforestation",
    title: "Main causes of deforestation in Democratic Republic of the Congo",
    subtitle: "Democratic Republic of the Congo",
    updatedAt: "2026-05-15T09:00:00.000Z",
    badge: "1 new alert",
    tags: ["Deforestation", "Drivers"],
    widgets: [
      w("drc-intro", {
        kind: "text",
        span: 2,
        text: "Shifting cultivation and small-scale logging remain the dominant drivers of forest loss in the DRC. The breakdown below attributes loss area to each driver category, with a regional ranking of the worst-affected provinces.",
      }),
      w("drc-drivers", {
        kind: "insight",
        span: 1,
        verified: true,
        insight: DRIVERS_PIE,
      }),
      w("drc-table", {
        kind: "insight",
        span: 1,
        verified: false,
        insight: TCL_TABLE,
      }),
    ],
  },
];

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Faked "alerts data freshness" indicator, deterministic per dashboard id so
 *  it stays stable across renders without storing a real timestamp. */
const ALERTS_FRESHNESS = [
  "12 minutes ago",
  "1 hour ago",
  "3 hours ago",
  "6 hours ago",
  "yesterday",
  "2 days ago",
];

export function fakeAlertsUpdated(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ALERTS_FRESHNESS[h % ALERTS_FRESHNESS.length];
}

/**
 * "Updated 2 days ago" for recent past, otherwise an absolute "Updated Aug 20,
 * 2026". Safe to call at render time because dashboards only render on the
 * client (the store hydrates from localStorage in an effect).
 */
export function formatUpdated(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Updated recently";
  const days = Math.round((Date.now() - then) / 86_400_000);
  if (days <= 0) {
    // today or a future-dated fixture → show the absolute date
    const d = new Date(iso);
    return `Updated ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  if (days === 1) return "Updated yesterday";
  if (days < 7) return `Updated ${days} days ago`;
  const d = new Date(iso);
  return `Updated ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
