import getChartColors from "./ChartColors";
import CHART_COLOR_MAPPING, {
  DATASET_SERIES_COLORS,
  DATASET_DIVERGENT_COLORS,
} from "@/app/config/chartColorMappings";
import type { ChartColorFields } from "@/app/types/chartColors";

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

// Sibling column the backend attaches next to a categorical column (e.g.
// "driver__slug" next to "driver") carrying a stable, untranslated slug —
// see src/agent/subagents/analyst/charts/color_resolver.py. `colorMap` below
// is keyed by that slug, not by the (possibly translated) display value.
const SLUG_COLUMN_SUFFIX = "__slug";

function isNumericValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "");
    return normalized !== "" && !Number.isNaN(Number(normalized));
  }
  return false;
}

function isNumericColumn(data: InputData[], key: string): boolean {
  return data.every((item) => isNumericValue(item[key]));
}

/** True when the same column value appears under multiple x-axis categories (long-format group key). */
function isGroupColumn(
  data: InputData[],
  xAxisKey: string,
  key: string
): boolean {
  const valueToXValues = new Map<string, Set<string>>();

  for (const item of data) {
    const groupValue = String(item[key]);
    const xValue = String(item[xAxisKey]);
    const xValues = valueToXValues.get(groupValue) ?? new Set<string>();
    xValues.add(xValue);
    valueToXValues.set(groupValue, xValues);
  }

  return [...valueToXValues.values()].some((xValues) => xValues.size > 1);
}

function buildMultiSeriesBar(
  data: ChartData[],
  seriesKeys: string[],
  defaultColors: string[]
): { data: ChartData[]; series: ChartSeries[] } {
  const series: ChartSeries[] = seriesKeys.map((key, index) => ({
    name: key,
    color: defaultColors[index % defaultColors.length],
  }));
  return { data, series };
}

function resolveValueKeys(
  keys: string[],
  xAxisKey: string,
  yAxis?: string,
  seriesFields?: string[]
): string[] {
  const candidateValueKeys = keys.filter((key) => key !== xAxisKey);
  if (seriesFields?.length) {
    return seriesFields.filter((key) => candidateValueKeys.includes(key));
  }
  if (yAxis && candidateValueKeys.includes(yAxis)) {
    return [yAxis];
  }
  return candidateValueKeys;
}

function filterChartDataColumns(
  data: InputData[],
  columns: string[]
): InputData[] {
  const keep = new Set(columns);
  return data.map((row) => {
    const filtered: InputData = {};
    for (const key of keep) {
      if (key in row) filtered[key] = row[key];
    }
    return filtered;
  });
}

/**
 * Transforms data into a format suitable for Chakra UI Charts.
 *
 * @param data The raw array of data points.
 * @param type The type of chart: "stacked", "grouped", "bar", or "scatter".
 * @param xAxis The key to use for the x-axis.
 * @param yAxis The key to use for the y-axis (required for scatter charts).
 * @param seriesFields Explicit metric columns for multi-series charts.
 * @param colorOverrides Backend-resolved colors (phase 2 of the color
 *   registry). When present they take precedence over the local
 *   `chartColorMappings.ts` config, which remains the fallback for
 *   pre-migration insights and categories with no registry entry.
 * @param lineField Column rendered as a Line overlay on top of the stacked
 *   bars (stacked-bar-with-line only) — excluded from the stack itself.
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
    | "scatter"
    | "stacked-bar-with-line"
    // Listed only so ChartWidget's call site typechecks. A hierarchy has no
    // cartesian axes and gets no branch below: WidgetMessage routes it to the
    // ghg-flux-tree slice, which builds its own plot, so this never runs for it.
    | "hierarchical-bar",
  xAxis?: string,
  yAxis?: string,
  datasetName?: string,
  seriesFields?: string[],
  colorOverrides?: ChartColorFields,
  lineField?: string
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
  const valueKeys = resolveValueKeys(keys, xAxisKey, yAxis, seriesFields);
  // The pie branch resolves per-row colors off this sibling slug column (see
  // SLUG_COLUMN_SUFFIX) — keep it even though it's not an axis/value column,
  // or scoping below would silently discard it.
  const xAxisSlugKey = `${xAxisKey}${SLUG_COLUMN_SUFFIX}`;
  // Scatter needs a third (name/label) column beyond x and y, so scoping to
  // [xAxis, yAxis] would discard it and leave the chart unable to render.
  const shouldScopeColumns =
    type !== "scatter" &&
    (Boolean(seriesFields?.length) ||
      (Boolean(yAxis) && type !== "grouped-bar"));
  const scopedData = shouldScopeColumns
    ? filterChartDataColumns(data, [
        xAxisKey,
        ...valueKeys,
        ...(keys.includes(xAxisSlugKey) ? [xAxisSlugKey] : []),
        ...(lineField && keys.includes(lineField) ? [lineField] : []),
      ])
    : data;
  const scopedFirstRow = scopedData[0];
  if (
    scopedFirstRow === null ||
    scopedFirstRow === undefined ||
    typeof scopedFirstRow !== "object" ||
    Array.isArray(scopedFirstRow)
  ) {
    return empty;
  }
  const scopedKeys = Object.keys(scopedFirstRow);
  const chartRows = scopedData as InputData[];

  const defaultColors = getChartColors();

  // --- Logic for PIE charts ---
  if (type === "pie") {
    const valueKey = yAxis || scopedKeys.find((key) => key !== xAxisKey);
    if (!valueKey) {
      return { data: [], series: [] };
    }

    const backendColorMap = colorOverrides?.colorMap;
    const colorPalette = CHART_COLOR_MAPPING[xAxisKey];
    const paletteByValue = colorPalette
      ? new Map(colorPalette.map((item) => [item.value, item.color]))
      : undefined;

    // Precedence per row: backend registry (keyed by the untranslated slug,
    // falling back to the display value) → local palette → default rotation.
    const pieChartColors = chartRows.map((item, index) => {
      const slug = String(item[xAxisSlugKey] ?? item[xAxisKey]);
      return (
        backendColorMap?.[slug] ||
        paletteByValue?.get(String(item[xAxisKey])) ||
        defaultColors[index % defaultColors.length]
      );
    });

    // For Pie charts, we need to add a color to each data point.
    const transformedData = chartRows.map((item, index) => ({
      ...item,
      color: pieChartColors[index],
    })) as ChartData[];

    let series: ChartSeries[];

    if (backendColorMap) {
      // Backend-resolved colors win outright (they're already computed into
      // pieChartColors above, per-row, via the __slug column) — build the
      // legend from first-seen row order, de-duplicated by display label.
      // colorMap has no inherent ordering, unlike the local
      // CHART_COLOR_MAPPING array, and a row's translated label may not
      // match the local palette's English `value` even when one exists.
      const seen = new Set<string>();
      series = [];
      chartRows.forEach((item, index) => {
        const label = String(item[xAxisKey]);
        if (seen.has(label)) return;
        seen.add(label);
        series.push({ name: label, color: pieChartColors[index] });
      });
    } else if (colorPalette) {
      // Order the legend by the local palette, keeping only the values that
      // actually appear in the data.
      const presentValues = new Set(
        transformedData.map((item) => item[xAxisKey])
      );
      series = colorPalette
        .filter((paletteItem) => presentValues.has(paletteItem.value))
        .map((paletteItem) => ({
          name: paletteItem.value,
          color: paletteItem.color,
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
    const nameKey = scopedKeys.find((k) => k !== xAxis && k !== yAxis);

    if (!nameKey) {
      console.error(
        "Could not determine the name key for the scatter plot labels."
      );
      return { data: [], series: [] };
    }

    const transformedData = chartRows.map((item) => ({
      [xAxis]: item[xAxis],
      [yAxis]: item[yAxis],
      name: item[nameKey],
    }));

    const datasetColor =
      colorOverrides?.seriesColor ??
      (datasetName ? DATASET_SERIES_COLORS[datasetName] : undefined);
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
    const chartValueKeys = resolveValueKeys(
      scopedKeys,
      xAxisKey,
      yAxis,
      seriesFields
    );

    // Multi-series: more than one value column → create a series per column
    if (chartValueKeys.length > 1) {
      return buildMultiSeriesBar(
        chartRows as ChartData[],
        chartValueKeys,
        defaultColors
      );
    }

    // Single series
    const divergent =
      colorOverrides?.divergentColors ??
      (datasetName ? DATASET_DIVERGENT_COLORS[datasetName] : undefined);
    const datasetColor =
      colorOverrides?.seriesColor ??
      (datasetName ? DATASET_SERIES_COLORS[datasetName] : undefined);

    // For bar charts with divergent colors, add per-bar _barColor based on value sign
    if (type === "bar" && divergent && chartValueKeys.length === 1) {
      const yKey = chartValueKeys[0];
      const coloredData = (chartRows as ChartData[]).map((item) => {
        const val = Number(item[yKey]);
        return {
          ...item,
          _barColor: val < 0 ? divergent.negative : divergent.positive,
        };
      });
      const series: ChartSeries[] = [{ name: yKey, color: divergent.positive }];
      return { data: coloredData, series };
    }

    // For line/area with divergent dataset, use the positive color as single series color
    const seriesColor = divergent?.positive || datasetColor || defaultColors[0];
    const series: ChartSeries[] = chartValueKeys.length
      ? [
          {
            name: chartValueKeys[0],
            color: seriesColor,
          },
        ]
      : [];
    return { data: chartRows as ChartData[], series };
  }

  // --- Logic for STACKED charts ---
  if (type === "stacked-bar") {
    const seriesKeys = resolveValueKeys(
      scopedKeys,
      xAxisKey,
      yAxis,
      seriesFields
    );
    const series: ChartSeries[] = seriesKeys.map((key, index) => ({
      name: key,
      color: defaultColors[index % defaultColors.length],
      stackId: "a", // All items in a stacked chart share a stackId
    }));
    // The data format is already correct for stacked charts.
    return { data: chartRows as ChartData[], series };
  }

  // --- Logic for a STACKED chart with a Line overlay (e.g. net flux) ---
  if (type === "stacked-bar-with-line") {
    const seriesKeys = resolveValueKeys(
      scopedKeys,
      xAxisKey,
      yAxis,
      seriesFields
    ).filter((key) => key !== lineField);
    // Per-series colors come from the backend color registry (`colorMap`),
    // keyed by series name — the same mechanism the pie branch uses — so a
    // caller can pin each stack segment to its designed color. Segments with
    // no registry entry fall back to the default rotation.
    const stackColorMap = colorOverrides?.colorMap;
    const series: ChartSeries[] = seriesKeys.map((key, index) => ({
      name: key,
      color:
        stackColorMap?.[key] ?? defaultColors[index % defaultColors.length],
      stackId: "a",
    }));

    // A single bar series with divergent colors (e.g. "Net flux" alone, no
    // detail breakdown) is tinted per-row by sign, mirroring the plain "bar"
    // branch above.
    const divergent =
      colorOverrides?.divergentColors ??
      (datasetName ? DATASET_DIVERGENT_COLORS[datasetName] : undefined);
    let rows = chartRows as ChartData[];
    if (divergent && seriesKeys.length === 1) {
      const key = seriesKeys[0];
      rows = rows.map((item) => {
        const val = Number(item[key]);
        return {
          ...item,
          _barColor: val < 0 ? divergent.negative : divergent.positive,
        };
      });
      series[0] = { ...series[0], color: divergent.positive };
    }

    if (lineField && scopedKeys.includes(lineField)) {
      series.push({
        name: lineField,
        color: "#172b7a",
      });
    }

    return { data: rows, series };
  }

  // --- Logic for GROUPED charts ---
  if (type === "grouped-bar") {
    const otherKeys = scopedKeys.filter((key) => key !== xAxisKey);
    if (otherKeys.length < 2) {
      console.error(
        "Grouped chart data must have at least three columns: an x-axis, a grouping column, and a value column."
      );
      return { data: [], series: [] };
    }

    const numericKeys = otherKeys.filter((key) =>
      isNumericColumn(chartRows, key)
    );
    const wideSeriesKeys = numericKeys.filter(
      (key) => !isGroupColumn(chartRows, xAxisKey, key)
    );

    // Wide format (e.g. Category + Mali Area Ha + Niger Area Ha): treat as multi-series bar.
    if (wideSeriesKeys.length >= 2) {
      return buildMultiSeriesBar(
        chartRows as ChartData[],
        wideSeriesKeys,
        defaultColors
      );
    }

    const groupKey =
      otherKeys.find((key) => isGroupColumn(chartRows, xAxisKey, key)) ??
      otherKeys.find((key) => !isNumericColumn(chartRows, key)) ??
      otherKeys[0];
    const valueKey =
      numericKeys.find((key) => key !== groupKey) ??
      otherKeys.find((key) => key !== groupKey);

    if (!valueKey) {
      console.error(
        "Grouped chart data must include a numeric value column in long format."
      );
      return { data: [], series: [] };
    }

    // Series are the unique values from the group column (e.g., years).
    const uniqueGroups = [
      ...new Set(chartRows.map((item) => String(item[groupKey]))),
    ].sort();
    const series: ChartSeries[] = uniqueGroups.map((group, index) => ({
      name: group,
      color: defaultColors[index % defaultColors.length],
    }));

    // Pivot the data from "long" to "wide" format.
    const pivotedDataMap = chartRows.reduce(
      (acc, item) => {
        const xAxisValue = String(item[xAxisKey]);
        const groupValue = String(item[groupKey]);

        acc[xAxisValue] = acc[xAxisValue] || { [xAxisKey]: xAxisValue };
        (acc[xAxisValue] as ChartData)[groupValue] = item[valueKey];

        return acc;
      },
      {} as { [key: string]: unknown }
    );

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

  // Extract common unit suffixes and format them as parenthetical.
  // Ordered most-specific first: "_tco2e_per_tonne" must win over "_tonnes",
  // and the CO₂e family over the bare "_t" / "_mt" patterns.
  const unitPatterns: [RegExp, string][] = [
    [/(_tco2e_per_tonne)$/i, "tCO₂e/t"],
    [/(_mgco2e)$/i, "MgCO₂e"],
    [/(_tco2e)$/i, "tCO₂e"],
    [/(_co2e)$/i, "CO₂e"],
    [/(_km2|_km²)$/i, "km²"],
    [/(_ha)$/i, "ha"],
    [/(_mt)$/i, "Mt"],
    [/(_tonnes|_t)$/i, "t"],
    [/(_pct|_percent|_%|_percentage)$/i, "%"],
  ];

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
    // Pick the unit from the *rounded* magnitude so 999,950 → "1M", not "1000K"
    const units: [number, string][] = [
      [1e9, "B"],
      [1e6, "M"],
      [1e3, "K"],
    ];
    for (const [divisor, suffix] of units) {
      const scaled = Math.round((value / divisor) * 10) / 10;
      if (Math.abs(scaled) >= 1) {
        return `${scaled.toFixed(1).replace(/\.0$/, "")}${suffix}`;
      }
    }
  }
  return value.toString();
};

/**
 * Full-precision locale formatting for tooltips: "1234567.891" → "1,234,567.89".
 * Years and non-numeric values pass through unchanged.
 */
export const formatTooltipValue = (value: unknown, key?: string): string => {
  if (key?.toString().toLowerCase() === "year") return String(value);
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || value === "" || value === null) {
    return String(value);
  }
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
};
