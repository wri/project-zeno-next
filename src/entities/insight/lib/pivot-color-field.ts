const PIVOTED_TYPES = new Set(["line", "area"]);

/**
 * Long-format rows (one per x value per category, the category named by the
 * chart's `color_field`) pivoted to one row per x value with a column per
 * category, which is the only shape a line or area series can be drawn from.
 * Without it, integrated alerts' `{alert_date, alert_confidence, area_ha}`
 * rows plot every confidence level as one zig-zagging series.
 *
 * Returns null when the chart is not a long-format line/area chart, so the
 * caller keeps the chart as it came. A category absent on some x value is
 * left absent, not zeroed: the backend omits a day with no alerts on purpose.
 */
export function pivotByColorField(chart: {
  type: string;
  data: unknown;
  xAxis: string;
  yAxis: string;
  colorField?: string | null;
}): { data: Record<string, unknown>[]; seriesFields: string[] } | null {
  const { type, data, xAxis, yAxis, colorField } = chart;
  if (
    !PIVOTED_TYPES.has(type) ||
    !colorField ||
    !xAxis ||
    !yAxis ||
    colorField === xAxis ||
    colorField === yAxis ||
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return null;
  }

  const rows = data as Record<string, unknown>[];
  if (!rows.every((row) => row && typeof row === "object" && colorField in row))
    return null;

  const byX = new Map<string, Record<string, unknown>>();
  const seriesFields: string[] = [];
  for (const row of rows) {
    const x = row[xAxis];
    const category = String(row[colorField]);
    if (!seriesFields.includes(category)) seriesFields.push(category);
    const key = String(x);
    let pivoted = byX.get(key);
    if (!pivoted) {
      pivoted = { [xAxis]: x };
      byX.set(key, pivoted);
    }
    pivoted[category] = row[yAxis];
  }

  return { data: [...byX.values()], seriesFields };
}
