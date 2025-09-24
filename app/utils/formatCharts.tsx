import getChartColors from "./ChartColors";

interface InputData {
  [key: string]: unknown | unknown;
}

interface ChartData {
  [key: string]: unknown;
}

interface ColorMapEntry {
  value: string;
  color: string;
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

//TODO: Generate this from the DATASET_CARDS fixture or move to config
const CHART_COLOR_MAPPING: Record<string, ColorMapEntry[]> = {
  "land_cover_type": [
    { value: "Tree cover", color: "#246E24" },
    { value: "Short vegetation", color: "#B9B91E" },
    { value: "Wetland – short vegetation", color: "#74D6B4" },
    { value: "Bare and sparse vegetation", color: "#FEFECC" },
    { value: "Water", color: "#6BAED6" },
    { value: "Snow/ice", color: "#ACD1E8" },
    { value: "Cropland", color: "#fff183" },
    { value: "Cultivated grasslands", color: "#FFCD73" },
    { value: "Built-up", color: "#e8765d" },
  ],
  "land_type": [
    {value: "Natural forests", color: "#246E24" },
    { value: "Natural peat forests", color: "#093D09" },
    { value: "Natural peat short vegetation", color: "#99991A" },
    { value: "Mangroves", color: "#06A285" },
    { value: "Wet natural forests", color: "#589558" },
    { value: "Wet natural short vegetation", color: "#DBDB7B" },
    { value: "Natural short vegetation", color: "#B9B91E" },
    { value: "Natural water", color: "#6BAED6" },
    { value: "Bare", color: "#FEFECC" },
    { value: "Snow", color: "#ACD1E8" },
    { value: "Crop", color: "#D3D3D3" },
    { value: "Built", color: "#D3D3D3" },
    { value: "Non-natural tree cover", color: "#D3D3D3" },
    { value: "Non-natural short vegetation", color: "#D3D3D3" },
    { value: "Wet non-natural tree cover", color: "#D3D3D3" },
    { value: "Non-natural peat tree cover", color: "#D3D3D3" },
    { value: "Wet non-natural short vegetation", color: "#D3D3D3" },
    { value: "Non-natural peat short vegetation", color: "#D3D3D3" },
    { value: "Non-natural water", color: "#D3D3D3" },
    { value: "Non-natural bare", color: "#D3D3D3" },
    { value: "Other", color: "#D3D3D3" }],
  "driver": [
    { value: "Logging", color: "#52A44E"},
    { value: "Shifting cultivation", color: "#E9D700"},
    { value: "Wildfire", color: "#885128"},
    { value: "Other natural disturbances", color: "#3B209A"},
    { value: "Settlements & Infrastructure", color: "#A354A0"},
    { value: "Hard commodities", color: "#246E24"},
    { value: "Permanent agriculture", color: "#E39D29"},
    { value: "Unknown", color: "#246E24"},
  ]

}
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
  
  const keys = Object.keys(data[0]);
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

    const series: ChartSeries[] = [
      {
        name: nameKey, // The series name can be derived from the label key
        color: defaultColors[0],
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
            color: defaultColors[0], // Assign the first color
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

// Custom label formatter for X-axis (truncate long names)
export const formatXAxisLabel = (value: string | number, key?: string) => {
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
