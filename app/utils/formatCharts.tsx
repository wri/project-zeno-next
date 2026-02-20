import getChartColors from "./ChartColors";
import CHART_COLOR_MAPPING, { DATASET_SERIES_COLORS } from "@/app/config/chartColorMappings";

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
  yAxis?: string,
  datasetName?: string
): { data: ChartData[]; series: ChartSeries[] } {
  const empty = { data: [], series: [] };

  if (!Array.isArray(data) || data.length === 0) {
    return empty;
  }

  // Validate that the first element is a non-null object with keys
  const firstRow = data[0];
  if (
    firstRow === null ||
    firstRow === undefined ||
    typeof firstRow !== "object" ||
    Array.isArray(firstRow)
  ) {
    console.error("formatChartData: data[0] is not a valid object", firstRow);
    return empty;
  }

  const keys = Object.keys(firstRow);
  if (keys.length === 0) {
    console.error("formatChartData: data[0] has no keys");
    return empty;
  }

  const xAxisKey = xAxis || keys[0]; //identify dataset
  
  const defaultColors = getChartColors();
  const chartColors = data.map(
    (_, index) => defaultColors[index % defaultColors.length]
  );

  // --- Logic for PIE charts ---
  if (type === "pie") {
    const valueKey = yAxis || keys.find((key) => key !== xAxisKey);
    if (!valueKey) {
      return { data: [], series: [] };
    }

    const colorPalette = CHART_COLOR_MAPPING[xAxisKey];
    let pieChartColors: string[] = [];

    if (colorPalette) {
      const valueToColorMap = new Map(
        colorPalette.map((item) => [item.value, item.color])
      );
      pieChartColors = data.map((item, index) => {
        const key = String(item[xAxisKey]);
        return (
          valueToColorMap.get(key) ||
          defaultColors[index % defaultColors.length]
        );
      });
    } else {
      pieChartColors = chartColors;
    }

    // For Pie charts, we need to add a color to each data point.
    const transformedData = data.map((item, index) => ({
      ...item,
      color: pieChartColors[index % pieChartColors.length],
    }));

    let series: ChartSeries[];

    if (colorPalette) {
      // Create a map for quick color lookup
      const valueToColorMap = new Map(
        colorPalette.map((item) => [item.value, item.color])
      );

      // Create a map for the original data values for sorting
      const dataValueMap = new Map(
        transformedData.map((item) => [item[xAxisKey], item])
      );

      // Sort the series based on the order in colorPalette
      series = colorPalette
        .filter((paletteItem) => dataValueMap.has(paletteItem.value)) // Ensure the item exists in the data
        .map((paletteItem) => ({
          name: paletteItem.value,
          color: valueToColorMap.get(paletteItem.value) || "#000000", // Fallback color
        }));
    } else {
      // Fallback to default series generation if no color palette is defined
      series = transformedData.map((item) => ({
        name: String(item[xAxisKey]),
        color: item.color as string,
      }));
    }

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

    const datasetColor = datasetName ? DATASET_SERIES_COLORS[datasetName] : undefined;
    const series: ChartSeries[] = [
      {
        name: nameKey, // The series name can be derived from the label key
        color: datasetColor || defaultColors[0],
      },
    ];

    return { data: transformedData as ChartData[], series };
  }
  // --- Logic for a standard BAR chart ---
  if (type === "bar" || type === "area" || type === "line") {
    const valueKeys = keys.filter((key) => key !== xAxisKey);

    // Multi-series: more than one value column → create a series per column
    if (valueKeys.length > 1) {
      const series: ChartSeries[] = valueKeys.map((key, index) => ({
        name: key,
        color: defaultColors[index % defaultColors.length],
      }));
      return { data: data as ChartData[], series };
    }

    // Single series
    const datasetColor = datasetName ? DATASET_SERIES_COLORS[datasetName] : undefined;
    const series: ChartSeries[] = valueKeys.length
      ? [
          {
            name: valueKeys[0],
            color: datasetColor || defaultColors[0],
          },
        ]
      : [];
    return { data: data as ChartData[], series };
  }

  // --- Logic for STACKED charts ---
  if (type === "stacked-bar") {
    // For stacked charts, series are all columns except the xAxisKey.
    const seriesKeys = keys.filter((key) => key !== xAxisKey);
    const series: ChartSeries[] = seriesKeys.map((key, index) => ({
      name: key,
      color: defaultColors[index % defaultColors.length],
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
      color: defaultColors[index % defaultColors.length],
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

/**
 * Convert a snake_case or camelCase field name into a readable axis label.
 * e.g. "area_km2" → "Area (km²)", "tree_cover_loss_ha" → "Tree cover loss (ha)"
 */
export const toAxisLabel = (key: string): string => {
  if (!key) return "";

  // Extract common unit suffixes and format them as parenthetical
  const unitPatterns: [RegExp, string][] = [
    (/(_km2|_km²)$/i), ("km²"),
    (/(_ha)$/i), ("ha"),
    (/(_mt|_tonnes|_t)$/i), ("t"),
    (/(_pct|_percent|_%|_percentage)$/i), ("%"),
  ].reduce<[RegExp, string][]>((acc, val, i, arr) => {
    if (i % 2 === 0) acc.push([arr[i] as RegExp, arr[i + 1] as string]);
    return acc;
  }, []);

  let label = key;
  let unit = "";

  for (const [pattern, unitStr] of unitPatterns) {
    if (pattern.test(label)) {
      label = label.replace(pattern, "");
      unit = unitStr;
      break;
    }
  }

  // Convert snake_case / camelCase to space-separated words
  label = label
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();

  // Sentence-case
  if (label.length > 0) {
    label = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  }

  return unit ? `${label} (${unit})` : label;
};

// Custom label formatter for X-axis (truncate long names)
export const formatXAxisLabel = (value: string | number, key?: string) => {
  // Check if the axis key is 'year' to prevent special formatting
  if (key?.toString().toLowerCase() === "year") {
    return value.toString();
  }
  if (typeof value === "string" && value.length > 14) {
    return `${value.slice(0, 12)}…`;
  }
  return value;
};

// Custom formatter for Y-axis (format large numbers)
export const formatYAxisLabel = (value: number, key?: string) => {
  // Check if the axis key is 'year' to prevent special formatting
  if (key?.toString().toLowerCase() === "year") {
    return value.toString();
  }

  if (value === 0) {
    return "0";
  }
  if (Number(value)) {
    if (Math.abs(value) < 1000) return value.toLocaleString();
    if (Math.abs(value) < 1e6) return `${(value / 1e3).toFixed(1)}K`;
    if (Math.abs(value) < 1e9) return `${(value / 1e6).toFixed(1)}M`;
    return `${(value / 1e9).toFixed(1)}B`;
  }
  return value.toString();
};
