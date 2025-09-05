import getChartColors from "./ChartColors";

interface InputData {
  [key: string]: unknown | unknown;
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
 * Transforms data into a format suitable for Chakra UI Charts.
 *
 * @param data The raw array of data points.
 * @param type The type of chart: "stacked", "grouped", "bar", or "scatter".
 * @param xAxis The key to use for the x-axis.
 * @param yAxis The key to use for the y-axis (required for scatter charts).
 * @returns An object containing the transformed `data` and `series` arrays.
 */

export default function formatChartData(
  data: InputData[] | unknown,
  type:
    | "line"
    | "bar"
    | "table"
    | "dataset-card"
    | "pie"
    | "stacked-bar"
    | "grouped-bar"
    | "area"
    | "scatter",
  xAxis?: string,
  yAxis?: string
): { data: ChartData[]; series: ChartSeries[] } {
  if (!Array.isArray(data) || data.length === 0) {
    return { data: [], series: [] };
  }

  const chartColors = getChartColors();
  const keys = Object.keys(data[0]);
  const xAxisKey = xAxis || keys[0];

  // --- Logic for PIE charts ---
  if (type === "pie") {
    const valueKey = yAxis || keys.find((key) => key !== xAxisKey);
    if (!valueKey) {
      console.error("Could not determine value key for Pie chart.");
      return { data: [], series: [] };
    }
    // For Pie charts, we need to add a color to each data point.
    const transformedData = data.map((item, index) => ({
      ...item,
      color: chartColors[index % chartColors.length],
    }));

    const series: ChartSeries[] = [
      {
        name: valueKey,
        color: chartColors[0], // A base color, though cells will override.
      },
    ];

    return { data: transformedData as ChartData[], series };
  }

  if (type === "scatter") {
    if (!xAxis || !yAxis) {
      console.error(
        "Scatter charts require both `xAxis` and `yAxis` props to be provided."
      );
      return { data: [], series: [] };
    }

    // The name key is the one that is not the x or y axis.
    const nameKey = keys.find((k) => k !== xAxis && k !== yAxis);

    if (!nameKey) {
      console.error(
        "Could not determine the name key for the scatter plot labels."
      );
      return { data: [], series: [] };
    }

    const transformedData = data.map((item) => ({
      [xAxis]: item[xAxis],
      [yAxis]: item[yAxis],
      name: item[nameKey],
    }));

    const series: ChartSeries[] = [
      {
        name: nameKey, // The series name can be derived from the label key
        color: chartColors[0],
      },
    ];

    return { data: transformedData as ChartData[], series };
  }
  // --- Logic for a standard BAR chart ---
  if (type === "bar" || type === "area" || type === "line") {
    // Bar, area and line charts have one series, which is the value column.
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

// Custom label formatter for X-axis (truncate long names)
export const formatXAxisLabel = (value: any, key?: string) => {
  // Check if the axis key is 'year' to prevent special formatting
  if (key?.toString().toLowerCase() === "year") {
    return value.toString();
  }
  if (typeof value === "string" && value.length > 10) {
    return `${value.slice(0, 10)}...`;
  }
  return value;
};

// Custom formatter for Y-axis (format large numbers)
export const formatYAxisLabel = (value: number, key?: string) => {
  // Check if the axis key is 'year' to prevent special formatting
  if (key?.toString().toLowerCase() === "year") {
    return value.toString();
  }
  if (Math.abs(value) < 1000) return value.toLocaleString();
  if (Math.abs(value) < 1e6) return `${(value / 1e3).toFixed(1)}K`;
  if (Math.abs(value) < 1e9) return `${(value / 1e6).toFixed(1)}M`;
  return `${(value / 1e9).toFixed(1)}B`;
};
