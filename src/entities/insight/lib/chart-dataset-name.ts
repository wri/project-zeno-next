/**
 * The dataset name to use in a chart's "{dataset} in {location}" title. Every
 * dataset uses its own name, with one exception: a tree cover loss analysis
 * also returns a GHG-emissions chart (see project-zeno `charts.py:
 * TCLChartGenerator`), identified by its y-axis, which is titled as
 * "GHG Emissions from Tree Cover Loss" instead.
 */
export function chartDatasetName(
  widget: { yAxis?: string },
  datasetName: string
): string {
  return widget.yAxis === "carbon_emissions_MgCO2e"
    ? "GHG Emissions from Tree Cover Loss"
    : datasetName;
}
