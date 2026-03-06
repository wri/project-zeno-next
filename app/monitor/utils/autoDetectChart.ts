import {
  DATASET_CHART_OVERRIDES,
  DATASETS,
  KNOWN_CATEGORICAL_COLUMNS,
  TIME_COLUMN_PATTERNS,
} from "../constants/datasets";
import type { DetectedChartConfig, DetectedChartType } from "../types/stream";

// ---------------------------------------------------------------------------
// Column classification helpers
// ---------------------------------------------------------------------------

/** Check if a column name looks like a time/date axis. */
function isTimeColumn(name: string): boolean {
  const lower = name.toLowerCase();
  return TIME_COLUMN_PATTERNS.some((p) => lower === p);
}

/** Check if a column has a known categorical colour mapping. */
function isKnownCategorical(name: string): boolean {
  return (KNOWN_CATEGORICAL_COLUMNS as readonly string[]).includes(name);
}

/**
 * Classify a column as numeric if >50% of non-null values are numbers.
 * This handles sparse data where some rows may have nulls.
 */
function isNumericColumn(
  rows: Record<string, unknown>[],
  col: string,
): boolean {
  let numCount = 0;
  let totalNonNull = 0;
  for (const row of rows) {
    const val = row[col];
    if (val === null || val === undefined) continue;
    totalNonNull++;
    if (typeof val === "number") numCount++;
  }
  return totalNonNull > 0 && numCount / totalNonNull > 0.5;
}

// ---------------------------------------------------------------------------
// Data reshaping helpers
// ---------------------------------------------------------------------------

/**
 * Pivots long-format data into wide format for stacked charts.
 *
 * Long:  [{year:2020, driver:"Logging", loss_ha:100}, {year:2020, driver:"Wildfire", loss_ha:50}]
 * Wide:  [{year:2020, Logging:100, Wildfire:50}]
 *
 * Used when we need to feed formatChartData's stacked-bar handler, which
 * expects wide format (xAxis column + one column per category).
 */
function pivotLongToWide(
  rows: Record<string, unknown>[],
  xAxis: string,
  yAxis: string,
  colorField: string,
): Record<string, unknown>[] {
  const map = new Map<string | number, Record<string, unknown>>();

  for (const row of rows) {
    const xVal = row[xAxis];
    const key = String(xVal);

    if (!map.has(key)) {
      map.set(key, { [xAxis]: xVal });
    }

    const wide = map.get(key)!;
    const category = String(row[colorField]);
    wide[category] = row[yAxis];
  }

  // Sort by x-axis value
  const entries = [...map.values()];
  entries.sort((a, b) => {
    const aVal = a[xAxis];
    const bVal = b[xAxis];
    if (typeof aVal === "number" && typeof bVal === "number")
      return aVal - bVal;
    return String(aVal).localeCompare(String(bVal));
  });

  return entries;
}

/**
 * Unpivots wide-format data with multiple numeric columns into long format.
 *
 * Wide:  [{carbon_net_flux: 100, carbon_gross_emissions: 200, carbon_gross_removals: -150}]
 * Long:  [{metric: "carbon_net_flux", value: 100},
 *         {metric: "carbon_gross_emissions", value: 200},
 *         {metric: "carbon_gross_removals", value: -150}]
 *
 * formatChartData's "bar" handler can then show each metric as a bar.
 * If there are multiple rows (e.g. per-AOI), the metric name combines the
 * column name only (grouped-bar pivot happens in formatChartData).
 */
function unpivotToLong(
  rows: Record<string, unknown>[],
  pivotColumns: string[],
  xAxisLabel: string,
  yAxisLabel: string,
): Record<string, unknown>[] {
  // Filter to columns that actually exist in the data
  const existingCols = pivotColumns.filter((col) => {
    return rows.some((r) => r[col] !== undefined && r[col] !== null);
  });

  if (existingCols.length === 0) return [];

  const result: Record<string, unknown>[] = [];
  for (const col of existingCols) {
    // Aggregate across rows (sum) for each metric
    let total = 0;
    for (const row of rows) {
      const val = row[col];
      if (typeof val === "number") total += val;
    }

    // Create a human-readable label from the column name
    const label = col
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/ Mg Co2e$/i, " (MgCO₂e)")
      .replace(/ Tco2e$/i, " (tCO₂e)");

    result.push({
      [xAxisLabel]: label,
      [yAxisLabel]: total,
    });
  }

  return result;
}

/**
 * Converts metric-only data (single value, no x-axis) into a chartable
 * format. If there's one row, we show a single bar. If there are multiple
 * rows that differ by some key, we try to use that as the x-axis.
 */
function reshapeMetricOnly(
  rows: Record<string, unknown>[],
  yAxis: string,
  datasetName: string,
): { data: Record<string, unknown>[]; xAxis: string } {
  const columns = Object.keys(rows[0] ?? {});
  const nonValueCols = columns.filter((c) => c !== yAxis);

  // If there are other columns that could serve as labels, use the first one
  const labelCol = nonValueCols.find(
    (c) => !isNumericColumn(rows, c),
  );

  if (labelCol && rows.length > 1) {
    // Multiple rows with a label column — use it as x-axis
    return { data: rows, xAxis: labelCol };
  }

  // Single value — create a synthetic label
  const total = rows.reduce((sum, r) => {
    const val = r[yAxis];
    return sum + (typeof val === "number" ? val : 0);
  }, 0);

  return {
    data: [{ label: datasetName, [yAxis]: total }],
    xAxis: "label",
  };
}

// ---------------------------------------------------------------------------
// Main: auto-detect chart configuration
// ---------------------------------------------------------------------------

/**
 * Determines the best chart type and axis mapping for a set of analytics
 * data rows.
 *
 * Strategy:
 * 1. Check DATASET_CHART_OVERRIDES for the dataset ID — if the override's
 *    columns exist in the data, use it (with reshaping if needed).
 * 2. Fall back to heuristic column classification.
 *
 * @param rows  The flat data rows (from AnalyticsDataItem.data.data)
 * @param datasetId  The dataset ID (0-9 for known datasets)
 * @param datasetName  Human-readable name for the chart label
 * @returns Chart configuration, or null if data is empty/unusable
 */
export function autoDetectChart(
  rows: Record<string, unknown>[],
  datasetId: number,
  datasetName?: string,
): DetectedChartConfig | null {
  if (!rows || rows.length === 0) return null;

  const columns = Object.keys(rows[0]);
  if (columns.length === 0) return null;

  const label = datasetName || DATASETS[datasetId] || `Dataset ${datasetId}`;

  // ------------------------------------------------------------------
  // 1. Try dataset-specific override
  // ------------------------------------------------------------------
  const override = DATASET_CHART_OVERRIDES[datasetId];
  if (override) {
    const result = applyOverride(override, rows, columns, label);
    if (result) return result;
    // Override columns don't match actual data — fall through to heuristics
  }

  // ------------------------------------------------------------------
  // 2. Classify columns
  // ------------------------------------------------------------------
  const timeCol = columns.find(isTimeColumn) ?? null;
  const numericCols = columns.filter((c) => isNumericColumn(rows, c));
  const categoricalCols = columns.filter(
    (c) => c !== timeCol && !numericCols.includes(c),
  );
  const knownCatCol = categoricalCols.find(isKnownCategorical) ?? null;

  // We need at least one numeric column to make a chart
  const primaryNumeric =
    numericCols.find((c) => c !== timeCol) ?? numericCols[0];
  if (!primaryNumeric) return null;

  // ------------------------------------------------------------------
  // 3. Decision tree
  // ------------------------------------------------------------------

  // 3a. Known categorical + time → stacked-bar
  if (knownCatCol && timeCol) {
    return {
      type: "stacked-bar",
      xAxis: timeCol,
      yAxis: primaryNumeric,
      colorField: knownCatCol,
      pivotedData: pivotLongToWide(rows, timeCol, primaryNumeric, knownCatCol),
      label,
    };
  }

  // 3b. Known categorical, no time → pie (≤12 categories) or bar
  if (knownCatCol && !timeCol) {
    const uniqueValues = new Set(rows.map((r) => r[knownCatCol]));
    const type: DetectedChartType = uniqueValues.size <= 12 ? "pie" : "bar";
    return { type, xAxis: knownCatCol, yAxis: primaryNumeric, label };
  }

  // 3c. Unknown categorical + time + 1 numeric → stacked-bar
  if (categoricalCols.length > 0 && timeCol && numericCols.length === 1) {
    const catCol = categoricalCols[0];
    return {
      type: "stacked-bar",
      xAxis: timeCol,
      yAxis: primaryNumeric,
      colorField: catCol,
      pivotedData: pivotLongToWide(rows, timeCol, primaryNumeric, catCol),
      label,
    };
  }

  // 3d. Time axis + 1 numeric → bar or line
  if (timeCol && numericCols.length === 1) {
    const type: DetectedChartType = rows.length > 20 ? "line" : "bar";
    return { type, xAxis: timeCol, yAxis: primaryNumeric, label };
  }

  // 3e. Time axis + multiple numeric columns → grouped-bar
  if (timeCol && numericCols.length >= 2) {
    return {
      type: "grouped-bar",
      xAxis: timeCol,
      yAxis: primaryNumeric,
      label,
    };
  }

  // 3f. No time, 1 categorical + 1 numeric → pie (≤12) or bar
  if (!timeCol && categoricalCols.length === 1 && numericCols.length >= 1) {
    const catCol = categoricalCols[0];
    const uniqueValues = new Set(rows.map((r) => r[catCol]));
    const type: DetectedChartType = uniqueValues.size <= 12 ? "pie" : "bar";
    return { type, xAxis: catCol, yAxis: primaryNumeric, label };
  }

  // 3g. No time, no categorical, only numeric → metric bar
  if (!timeCol && categoricalCols.length === 0 && numericCols.length >= 1) {
    const { data, xAxis } = reshapeMetricOnly(rows, primaryNumeric, label);
    return { type: "bar", xAxis, yAxis: primaryNumeric, pivotedData: data, label };
  }

  // 3h. Fallback — bar chart
  const xAxis = timeCol ?? categoricalCols[0] ?? columns[0];
  return { type: "bar", xAxis, yAxis: primaryNumeric, label };
}

// ---------------------------------------------------------------------------
// Apply a dataset-specific override with reshaping
// ---------------------------------------------------------------------------

function applyOverride(
  override: (typeof DATASET_CHART_OVERRIDES)[number],
  rows: Record<string, unknown>[],
  columns: string[],
  label: string,
): DetectedChartConfig | null {
  // --- metric-only mode ---
  if (override.reshapeMode === "metric-only") {
    // Check if the value column exists
    if (!columns.includes(override.yAxis)) return null;
    const { data, xAxis } = reshapeMetricOnly(rows, override.yAxis, label);
    return {
      type: "bar",
      xAxis,
      yAxis: override.yAxis,
      pivotedData: data,
      label,
    };
  }

  // --- pivot-long mode (e.g. dataset 6 carbon flux) ---
  if (override.reshapeMode === "pivot-long" && override.pivotColumns) {
    // Check that at least some pivot columns exist
    const existingCols = override.pivotColumns.filter((c) =>
      columns.includes(c),
    );
    if (existingCols.length === 0) return null;

    const data = unpivotToLong(
      rows,
      existingCols,
      override.xAxis, // "metric"
      override.yAxis, // "value"
    );
    return {
      type: "bar", // Simple bar — one bar per metric
      xAxis: override.xAxis,
      yAxis: override.yAxis,
      pivotedData: data,
      label,
    };
  }

  // --- grouped-bar with colorField (e.g. dataset 9) ---
  // formatChartData's grouped-bar expects 3 columns: [xAxis, groupKey, valueKey]
  // where groupKey is the first non-xAxis column and valueKey is the second.
  // We need to ensure column order matches.
  if (override.type === "grouped-bar" && override.colorField) {
    if (
      !columns.includes(override.xAxis) ||
      !columns.includes(override.yAxis) ||
      !columns.includes(override.colorField)
    ) {
      return null;
    }

    // Reformat data to have columns in the order formatChartData expects:
    // [xAxis, groupKey, valueKey]
    const reordered = rows.map((row) => ({
      [override.xAxis]: row[override.xAxis],
      [override.colorField!]: row[override.colorField!],
      [override.yAxis]: row[override.yAxis],
    }));

    return {
      type: "grouped-bar",
      xAxis: override.xAxis,
      yAxis: override.yAxis,
      colorField: override.colorField,
      pivotedData: reordered,
      label,
    };
  }

  // --- stacked-bar with colorField (e.g. dataset 8) ---
  if (
    override.colorField &&
    (override.type === "stacked-bar" || override.type === "grouped-bar")
  ) {
    if (
      !columns.includes(override.xAxis) ||
      !columns.includes(override.yAxis) ||
      !columns.includes(override.colorField)
    ) {
      return null;
    }

    return {
      type: override.type,
      xAxis: override.xAxis,
      yAxis: override.yAxis,
      colorField: override.colorField,
      pivotedData: pivotLongToWide(
        rows,
        override.xAxis,
        override.yAxis,
        override.colorField,
      ),
      label,
    };
  }

  // --- Simple types (bar, line, area, pie) ---
  // For bar/line/area: formatChartData expects exactly 2 columns.
  // For pie: formatChartData expects {categoryKey, valueKey}.
  // Strip extra columns so formatChartData picks the right series.
  if (
    !columns.includes(override.xAxis) ||
    !columns.includes(override.yAxis)
  ) {
    return null;
  }

  // Build data with only the 2 columns formatChartData needs
  const strippedData = rows.map((row) => ({
    [override.xAxis]: row[override.xAxis],
    [override.yAxis]: row[override.yAxis],
  }));

  // Sort by x-axis for time-series charts
  if (override.type === "bar" || override.type === "line" || override.type === "area") {
    strippedData.sort((a, b) => {
      const aVal = a[override.xAxis];
      const bVal = b[override.xAxis];
      if (typeof aVal === "number" && typeof bVal === "number")
        return aVal - bVal;
      return String(aVal).localeCompare(String(bVal));
    });
  }

  return {
    type: override.type,
    xAxis: override.xAxis,
    yAxis: override.yAxis,
    pivotedData: strippedData,
    label,
  };
}

// ---------------------------------------------------------------------------
// Batch: detect charts for all analytics items from one dataset
// ---------------------------------------------------------------------------

import { extractRows } from "./extractRows";

/**
 * Generates chart configs for all AnalyticsDataItems belonging to one dataset.
 * Returns an array where each item has a chart config (or null if unchartable).
 */
export function detectChartsForDataset(
  analyticsItems: { data: unknown }[],
  datasetId: number,
  datasetName?: string,
): (DetectedChartConfig | null)[] {
  return analyticsItems.map((item, index) => {
    const rows = extractRows(item.data);
    const suffix =
      analyticsItems.length > 1 ? ` (source ${index + 1})` : "";
    return autoDetectChart(rows, datasetId, (datasetName ?? "") + suffix);
  });
}
