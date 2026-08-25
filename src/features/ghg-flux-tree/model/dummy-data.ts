import type { Chart } from "@/src/entities/insight";
import { chartsToWidgets } from "@/src/entities/insight";
import type { AnalysisResult } from "@/src/features/analysis";
import type { InsightWidget } from "@/app/types/chat";

/**
 * Land GHG Monitoring System (LGMS) — the dataset behind both curated GHG-flux
 * insights. Distinct from "Forest greenhouse gas net flux" (dataset 6), whose
 * catalogue reports a cumulative 2001-2025 total rather than annual values.
 */
export const LGMS_DATASET_ID = 12;

/** Value columns, named so the backend's axis validator is satisfied. */
export const FLUX_SERIES_FIELDS = ["avg_emissions", "avg_removals"];

/**
 * Annual-average node tree in MgCO2e/yr (megagrams, i.e. metric tonnes —
 * matches project-zeno's land_ghg_inventory catalog entry, not megatonnes),
 * taken from the design's gross frame. Emissions positive, removals
 * negative, `null` where a metric does not apply — which is exactly the set
 * of rows the design annotates "emissions only" / "removals only".
 *
 * Kept in the backend's snake_case wire shape so it flows through the same
 * `parseFluxNodes` anti-corruption layer the real endpoint will.
 */
const FLUX_TREE_ROWS: Record<string, unknown>[] = [
  {
    id: "all_land",
    parent_id: null,
    label: "All land",
    avg_emissions: 1600,
    avg_removals: -750,
  },
  {
    id: "land_use",
    parent_id: "all_land",
    label: "Land use",
    avg_emissions: 1350,
    avg_removals: -750,
  },
  {
    id: "vegetation",
    parent_id: "land_use",
    label: "Vegetation",
    avg_emissions: 530,
    avg_removals: -710,
  },
  {
    id: "tree_loss",
    parent_id: "vegetation",
    label: "Tree loss",
    avg_emissions: 400,
    avg_removals: null,
  },
  {
    id: "tree_gain",
    parent_id: "vegetation",
    label: "Tree gain",
    avg_emissions: null,
    avg_removals: -560,
  },
  {
    id: "trees_remaining_trees",
    parent_id: "vegetation",
    label: "Trees remaining trees",
    avg_emissions: 100,
    avg_removals: -140,
  },
  {
    id: "non_trees_remaining_non_trees",
    parent_id: "vegetation",
    label: "Non-trees remaining non-trees",
    avg_emissions: 30,
    avg_removals: -10,
  },
  {
    id: "soil",
    parent_id: "land_use",
    label: "Soil",
    avg_emissions: 820,
    avg_removals: -40,
  },
  {
    id: "mineral_soil",
    parent_id: "soil",
    label: "Mineral soil",
    avg_emissions: 130,
    avg_removals: -40,
  },
  {
    id: "organic_soil",
    parent_id: "soil",
    label: "Organic soil",
    avg_emissions: 690,
    avg_removals: null,
  },
  {
    id: "agriculture",
    parent_id: "all_land",
    label: "Agriculture",
    avg_emissions: 250,
    avg_removals: null,
  },
  {
    id: "cropland",
    parent_id: "agriculture",
    label: "Crop management",
    avg_emissions: 150,
    avg_removals: null,
  },
  {
    id: "livestock",
    parent_id: "agriculture",
    label: "Livestock",
    avg_emissions: 100,
    avg_removals: null,
  },
];

const FLUX_TREE_CHART: Chart = {
  id: "ghg-flux-tree-dummy",
  position: 3,
  title: "Net GHG flux (annual average)",
  type: "hierarchical-bar",
  // A hierarchy has no cartesian axes; the value columns carry the data.
  xAxis: "",
  yAxis: "",
  colorField: "",
  stackField: "",
  groupField: "",
  seriesFields: FLUX_SERIES_FIELDS,
  data: FLUX_TREE_ROWS,
};

/**
 * Canned analysis result for the annual-average chart, keyed into
 * `DatasetOverrideGateway` until project-zeno ships a chart generator for
 * dataset 12 (see the backend shape proposal in the implementation plan).
 */
export const GHG_FLUX_TREE_DUMMY_RESULT: AnalysisResult = {
  id: "ghg-flux-tree-dummy-result",
  charts: [FLUX_TREE_CHART],
};

/**
 * The dummy chart mapped through the real Chart -> InsightWidget ACL, so
 * `/chart-debug` and tests exercise the same mapping real data will.
 */
export const GHG_FLUX_TREE_DUMMY_WIDGET: InsightWidget = chartsToWidgets(
  GHG_FLUX_TREE_DUMMY_RESULT.charts
)[0];
