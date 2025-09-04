import getChartColors from "./ChartColors";

interface InputData {
  [key: string]: unknown;
}

interface ChartData {
  [key: string]: unknown;
}

interface ChartSeries {
  name: string;
  color: string;
  stackId?: string;
}

/**
 * Transforms data into a format suitable for Chakra UI Bar Charts.
 * It automatically determines keys based on column order, unless an xAxis is provided.
 *
 * @param data The raw array of data points.
 * @param type The type of chart, either "stacked", "grouped", or "bar".
 * @param xAxis The key to use for the x-axis. Defaults to the first key if not provided.
 * @returns An object containing the transformed `data` and `series` arrays.
 */
export default function formatBarChartData(
  data: InputData[],
  type: "stacked-bar" | "grouped-bar" | "bar",
  xAxis?: string
): { data: ChartData[]; series: ChartSeries[] } {
  if (!data || data.length === 0) {
    return { data: [], series: [] };
  }

  const chartColors = getChartColors();
  const keys = Object.keys(data[0]);
  const xAxisKey = xAxis || keys[0];

  // --- Logic for a standard BAR chart ---
  if (type === "bar") {
    // A simple bar chart has one series, which is the value column.
    const valueKey = keys.find((key) => key !== xAxisKey);

    const series: ChartSeries[] = valueKey
      ? [
          {
            name: valueKey,
            color: chartColors[0], // Assign the first color
          },
        ]
      : [];
    // Data is used as-is.
    return { data: data as ChartData[], series };
  }

  // --- Logic for STACKED charts ---
  if (type === "stacked-bar") {
    // For stacked charts, series are all columns except the xAxisKey.
    const seriesKeys = keys.filter((key) => key !== xAxisKey);
    const series: ChartSeries[] = seriesKeys.map((key, index) => ({
      name: key,
      color: chartColors[index % chartColors.length],
      stackId: "a", // All items in a stacked chart share a stackId
    }));
    // The data format is already correct for stacked charts.
    return { data: data as ChartData[], series };
  }

  // --- Logic for GROUPED charts ---
  if (type === "grouped-bar") {
    const otherKeys = keys.filter((key) => key !== xAxisKey);
    if (otherKeys.length < 2) {
      console.error(
        "Grouped chart data must have at least three columns: an x-axis, a grouping column, and a value column."
      );
      return { data: [], series: [] };
    }
    const groupKey = otherKeys[0];
    const valueKey = otherKeys[1];

    // Series are the unique values from the group column (e.g., years).
    const uniqueGroups = [
      ...new Set(data.map((item) => String(item[groupKey]))),
    ].sort();
    const series: ChartSeries[] = uniqueGroups.map((group, index) => ({
      name: group,
      color: chartColors[index % chartColors.length],
    }));

    // Pivot the data from "long" to "wide" format.
    const pivotedDataMap = data.reduce((acc, item) => {
      const xAxisValue = String(item[xAxisKey]);
      const groupValue = String(item[groupKey]);

      acc[xAxisValue] = acc[xAxisValue] || { [xAxisKey]: xAxisValue };
      (acc[xAxisValue] as ChartData)[groupValue] = item[valueKey];

      return acc;
    }, {} as { [key: string]: unknown });

    return { data: Object.values(pivotedDataMap) as ChartData[], series };
  }

  // Return empty if the type is not recognized.
  return { data: [], series: [] };
}
