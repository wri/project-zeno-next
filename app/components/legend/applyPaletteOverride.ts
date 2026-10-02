import type { DatasetLegendConfig } from "@/app/constants/datasets";
import type { DatasetPalette } from "@/app/schemas/api/datasets/get";

/**
 * Legend types whose `items` are a flat list of discrete swatches, and so can
 * safely be swapped for the registry's category list or flattened to a single
 * series color. Gradient legends ("sequential", "divergent") read `items` as
 * ordered min→max stops — renderLegendSymbology takes the first and last
 * labels as the endpoints — so either override would render nonsense there.
 * Listing the safe types (rather than excluding the unsafe ones) means a new
 * legend type is left untouched until it is explicitly opted in.
 */
const OVERRIDABLE_LEGEND_TYPES: ReadonlySet<DatasetLegendConfig["type"]> =
  new Set(["symbol", "categorical"]);

/**
 * Overrides a dataset's hardcoded legend colors with the backend-owned
 * palette (see docs/insight-chart-colors-plan.md in project-zeno), so the
 * map legend is guaranteed to match the colors used in generated charts.
 *
 * Falls back to the static legend when no backend palette is available yet
 * (e.g. still loading) — this is a progressive enhancement, not a hard
 * dependency. Datasets with `legend_categories: false` (e.g. SBTN Natural
 * Lands, which intentionally collapses its non-natural classes into one
 * legend row) keep their hand-curated static `items` too; only their series
 * color comes from the registry.
 */
export function applyPaletteOverride(
  legend: DatasetLegendConfig,
  palette?: DatasetPalette
): DatasetLegendConfig {
  if (!palette || !OVERRIDABLE_LEGEND_TYPES.has(legend.type)) return legend;

  if (palette.categories.length > 0 && palette.legend_categories) {
    return {
      ...legend,
      items: palette.categories.map((category) => ({
        label: category.label_en,
        color: category.color,
      })),
    };
  }

  if (palette.series_color) {
    const seriesColor = palette.series_color;
    return {
      ...legend,
      color: seriesColor,
      items: legend.items?.map((item) => ({ ...item, color: seriesColor })),
    };
  }

  return legend;
}
