import type { Chart } from "@/src/entities/insight";
import { chartDatasetName, generateInsightTitle } from "@/src/entities/insight";
import { withChartTitle } from "@/src/features/dashboards/lib/widgets";

/**
 * The widget `config` to POST when a curated analysis lands on a dashboard:
 * a per-chart "{dataset} in {area}" title override for every chart, so the
 * grid cards match the titles the direct-analysis flow gives the same charts
 * on the map (use-analysis.ts). Without overrides the grid would fall back to
 * the backend generators' generic chart titles ("Tree Cover Loss (ha)" etc.).
 *
 * The dataset name is resolved per chart, not per analysis: a tree cover loss
 * analysis returns a loss chart AND a GHG-emissions chart, which must not
 * share one title.
 */
export function curatedWidgetConfig(
  charts: Chart[],
  datasetName: string,
  areaName: string
): Record<string, unknown> {
  return charts.reduce<Record<string, unknown>>(
    (config, chart) =>
      withChartTitle(
        config,
        chart.id,
        generateInsightTitle({
          datasetName: chartDatasetName(chart, datasetName),
          locationName: areaName,
          areaLabel: areaName,
        })
      ),
    {}
  );
}
