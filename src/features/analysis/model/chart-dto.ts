/** Raw chart data received from the analysis API. Mirrors InsightChartResponse. */
export interface ChartDTO {
  id: string;
  position: number;
  title: string;
  /** Maps to InsightChartResponse.chart_type */
  type: string;
  /** Maps to InsightChartResponse.x_axis */
  xAxis: string;
  /** Maps to InsightChartResponse.y_axis */
  yAxis: string;
  /** Maps to InsightChartResponse.color_field */
  colorField: string;
  /** Maps to InsightChartResponse.stack_field */
  stackField: string;
  /** Maps to InsightChartResponse.group_field */
  groupField: string;
  /** Maps to InsightChartResponse.series_fields */
  seriesFields: string[];
  /** Maps to InsightChartResponse.chart_data */
  data: Record<string, unknown>[];
}
