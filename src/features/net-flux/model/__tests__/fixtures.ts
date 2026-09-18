import type { InsightWidget } from "@/app/types/chat";

/**
 * The three time-series charts project-zeno's `LGMSChartGenerator` returns for
 * one LGMS analysis, shaped exactly as the backend sends them (`series_fields`
 * in its order, one row per year, values in Mg). Shared by the model and UI
 * tests so a backend series change is applied in one place.
 */

/**
 * Shaped like project-zeno's "Net GHG Flux by Category" chart: `series_fields`
 * in the backend's own order (emissions, then removals) and one row per year.
 */
export const CATEGORY_WIDGET: InsightWidget = {
  type: "stacked-bar-with-line",
  title: "Net GHG Flux by Category",
  description: "",
  xAxis: "year",
  yAxis: "",
  seriesFields: [
    "vegetation_emissions",
    "soil_emissions",
    "cropland_management_emissions",
    "livestock_emissions",
    "vegetation_removals",
    "soil_removals",
  ],
  data: [
    {
      year: 2020,
      // The backend's flux fields are Mg (metric tons), unconverted — these
      // round-number-in-megatonnes values are chosen so `deriveNetFluxVariant`'s
      // Mg→Mt scaling produces the same friendly numbers the tests assert on.
      vegetation_emissions: 530_000_000,
      soil_emissions: 820_000_000,
      cropland_management_emissions: 150_000_000,
      livestock_emissions: 100_000_000,
      vegetation_removals: -710_000_000,
      soil_removals: -40_000_000,
    },
  ],
};

// (530 + 820 + 150 + 100 - 710 - 40) once scaled from Mg to Mt
export const CATEGORY_NET = 850;

/**
 * The same analysis at project-zeno's "Full Detail" level: one field per LGMS
 * leaf class, 7 emissions then 4 removals, in the backend's own order.
 */
export const FULL_DETAIL_WIDGET: InsightWidget = {
  type: "stacked-bar-with-line",
  title: "Net GHG Flux — Full Detail",
  description: "",
  xAxis: "year",
  yAxis: "",
  seriesFields: [
    "tree_loss_emissions",
    "trees_remaining_trees_emissions",
    "non_trees_remaining_non_trees_emissions",
    "mineral_soil_emissions",
    "organic_soil_emissions",
    "cropland_management_emissions",
    "livestock_emissions",
    "tree_gain_removals",
    "trees_remaining_trees_removals",
    "non_trees_remaining_non_trees_removals",
    "mineral_soil_removals",
  ],
  data: [
    {
      year: 2020,
      tree_loss_emissions: 567_000_000,
      trees_remaining_trees_emissions: 162_000_000,
      non_trees_remaining_non_trees_emissions: 81_000_000,
      mineral_soil_emissions: 162_000_000,
      organic_soil_emissions: 378_000_000,
      cropland_management_emissions: 150_000_000,
      livestock_emissions: 100_000_000,
      tree_gain_removals: -506_000_000,
      trees_remaining_trees_removals: -135_000_000,
      non_trees_remaining_non_trees_removals: -34_000_000,
      mineral_soil_removals: -75_000_000,
    },
  ],
};

/** And at the "Summary" level: land use vs agriculture, three fields. */
export const SUMMARY_WIDGET: InsightWidget = {
  type: "stacked-bar-with-line",
  title: "Net GHG Flux — Summary",
  description: "",
  xAxis: "year",
  yAxis: "",
  seriesFields: [
    "land_use_emissions",
    "agriculture_emissions",
    "land_use_removals",
  ],
  data: [
    {
      year: 2020,
      land_use_emissions: 1_350_000_000,
      agriculture_emissions: 250_000_000,
      land_use_removals: -750_000_000,
    },
  ],
};

/** The three roll-ups in the DETAIL pill's display order. */
export const DETAIL_LEVEL_WIDGETS: [string, InsightWidget][] = [
  ["Full detail", FULL_DETAIL_WIDGET],
  ["Category", CATEGORY_WIDGET],
  ["Summary", SUMMARY_WIDGET],
];
