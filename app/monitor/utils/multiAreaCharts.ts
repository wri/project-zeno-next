/**
 * Generates structured multi-area chart sets for datasets with >1 AOI.
 *
 * IMPORTANT: The backend returns all areas in a single analytics item when
 * multiple area_ids are sent. Areas are distinguished by a column in the
 * data rows (typically `name`, `aoi_id`, or `aoi_name`), NOT by separate
 * AnalyticsDataItems.
 *
 * Three chart types:
 * 1. Per-area — one simple chart per area
 * 2. Comparison — all areas overlaid on the same chart
 * 3. Total — all values summed across areas
 */

import type { DetectedChartConfig, DetectedChartType } from "../types/stream";
import type { AnalyticsDataItem } from "../types/stream";
import { extractRows } from "./extractRows";
import {
  DATASET_CHART_OVERRIDES,
  DATASET_META,
  DATASETS,
  TIME_COLUMN_PATTERNS,
  KNOWN_CATEGORICAL_COLUMNS,
} from "../constants/datasets";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTimeColumn(name: string): boolean {
  return TIME_COLUMN_PATTERNS.some((p) => name.toLowerCase() === p);
}

function isNumericColumn(
  rows: Record<string, unknown>[],
  col: string,
): boolean {
  let numCount = 0;
  let total = 0;
  for (const row of rows) {
    const val = row[col];
    if (val == null) continue;
    total++;
    if (typeof val === "number") numCount++;
  }
  return total > 0 && numCount / total > 0.5;
}

function isKnownCategorical(name: string): boolean {
  return (KNOWN_CATEGORICAL_COLUMNS as readonly string[]).includes(name);
}

/** Column names that identify which area/AOI a row belongs to. */
const AREA_ID_COLUMNS = [
  "name",
  "aoi_id",
  "aoi_name",
  "country",
  "region",
] as const;

/**
 * Find the column in the data that identifies different areas.
 * Returns null if no area column found or all rows have the same value.
 */
function detectAreaColumn(rows: Record<string, unknown>[]): string | null {
  if (rows.length === 0) return null;
  const columns = Object.keys(rows[0]);

  for (const candidate of AREA_ID_COLUMNS) {
    if (!columns.includes(candidate)) continue;
    // Check it has >1 distinct value (otherwise it's not a useful area splitter)
    const values = new Set(rows.map((r) => String(r[candidate] ?? "")));
    if (values.size > 1) return candidate;
  }

  // Fallback: look for any string column with few distinct values (2-20)
  // that isn't a known categorical or time column
  for (const col of columns) {
    if (isTimeColumn(col)) continue;
    if (isKnownCategorical(col)) continue;
    if (isNumericColumn(rows, col)) continue;
    const values = new Set(rows.map((r) => String(r[col] ?? "")));
    if (values.size >= 2 && values.size <= 20) return col;
  }

  return null;
}

function resolveAxes(
  rows: Record<string, unknown>[],
  datasetId: number,
  areaCol: string | null,
): {
  xAxis: string;
  yAxis: string;
  isTimeSeries: boolean;
  colorField: string | null;
} | null {
  if (rows.length === 0) return null;
  const columns = Object.keys(rows[0]);

  const override = DATASET_CHART_OVERRIDES[datasetId];
  if (override) {
    // metric-only: use the yAxis column directly for multi-area splitting
    if (override.reshapeMode === "metric-only") {
      if (columns.includes(override.yAxis)) {
        return {
          xAxis: override.yAxis,
          yAxis: override.yAxis,
          isTimeSeries: false,
          colorField: null,
        };
      }
      // fall through to heuristic
    }

    // pivot-long: use first available pivot column as yAxis for multi-area
    if (override.reshapeMode === "pivot-long" && override.pivotColumns) {
      const firstCol = override.pivotColumns.find((c) => columns.includes(c));
      if (firstCol) {
        return {
          xAxis: firstCol,
          yAxis: firstCol,
          isTimeSeries: false,
          colorField: null,
        };
      }
      // fall through to heuristic
    }

    if (columns.includes(override.xAxis) && columns.includes(override.yAxis)) {
      const cf =
        override.colorField && columns.includes(override.colorField)
          ? override.colorField
          : null;
      return {
        xAxis: override.xAxis,
        yAxis: override.yAxis,
        isTimeSeries: isTimeColumn(override.xAxis),
        colorField: cf,
      };
    }
  }

  const timeCol = columns.find(isTimeColumn) ?? null;
  const numericCols = columns.filter((c) => isNumericColumn(rows, c));
  const primaryNumeric =
    numericCols.find((c) => c !== timeCol) ?? numericCols[0];
  if (!primaryNumeric) return null;

  // Find colorField (categorical that isn't the area column or time column)
  const catCols = columns.filter(
    (c) => c !== timeCol && c !== areaCol && !numericCols.includes(c),
  );
  const knownCatCols = catCols.filter(isKnownCategorical);

  // Only assign colorField when there are 2+ known categoricals (e.g. crop_type
  // + gas_type). When there's just one categorical, it should be the xAxis so
  // multi-area comparison charts can stack by it.
  const colorField = knownCatCols.length >= 2 ? knownCatCols[0] : null;

  const xAxis = timeCol ?? catCols.find((c) => c !== colorField) ?? columns[0];
  return { xAxis, yAxis: primaryNumeric, isTimeSeries: !!timeCol, colorField };
}

function sortByX(
  data: Record<string, unknown>[],
  xAxis: string,
): Record<string, unknown>[] {
  return [...data].sort((a, b) => {
    const aVal = a[xAxis];
    const bVal = b[xAxis];
    if (typeof aVal === "number" && typeof bVal === "number")
      return aVal - bVal;
    return String(aVal ?? "").localeCompare(String(bVal ?? ""));
  });
}

function aggregateRows(
  rows: Record<string, unknown>[],
  xAxis: string,
  yAxis: string,
  colorField?: string | null,
): Record<string, unknown>[] {
  if (colorField) {
    const makeKey = (r: Record<string, unknown>) =>
      `${String(r[xAxis])}|||${String(r[colorField])}`;
    const map = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const k = makeKey(row);
      const val = typeof row[yAxis] === "number" ? (row[yAxis] as number) : 0;
      const existing = map.get(k);
      if (existing) {
        (existing as Record<string, number>)[yAxis] += val;
      } else {
        map.set(k, {
          [xAxis]: row[xAxis],
          [colorField]: row[colorField],
          [yAxis]: val,
        });
      }
    }
    return [...map.values()];
  }

  const map = new Map<string, { x: unknown; sum: number }>();
  for (const row of rows) {
    const k = String(row[xAxis]);
    const val = typeof row[yAxis] === "number" ? (row[yAxis] as number) : 0;
    const existing = map.get(k);
    if (existing) existing.sum += val;
    else map.set(k, { x: row[xAxis], sum: val });
  }
  return [...map.values()].map((v) => ({ [xAxis]: v.x, [yAxis]: v.sum }));
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface MultiAreaChartSet {
  perArea: DetectedChartConfig[];
  comparison: DetectedChartConfig | null;
  total: DetectedChartConfig | null;
  /** Number of distinct areas found. 0 or 1 means single-area. */
  areaCount: number;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function generateMultiAreaCharts(
  analyticsItems: AnalyticsDataItem[],
  datasetId: number,
): MultiAreaChartSet {
  const empty: MultiAreaChartSet = {
    perArea: [],
    comparison: null,
    total: null,
    areaCount: 0,
  };
  const datasetName = DATASETS[datasetId] ?? `Dataset ${datasetId}`;

  // Collect ALL rows from all analytics items
  const allRows: Record<string, unknown>[] = [];
  for (const item of analyticsItems) {
    allRows.push(...extractRows(item.data));
  }
  if (allRows.length === 0) return empty;

  // Detect which column identifies the area
  const areaCol = detectAreaColumn(allRows);

  // If no area column found, check if there are multiple analytics items
  // with different aoi_names (legacy: one item per area)
  if (!areaCol) {
    return generateFromSeparateItems(analyticsItems, datasetId);
  }

  // Get distinct areas from the data
  const areaValues = [
    ...new Set(allRows.map((r) => String(r[areaCol] ?? "Unknown"))),
  ];
  if (areaValues.length <= 1) {
    return { ...empty, areaCount: areaValues.length };
  }

  // Resolve axes (excluding the area column)
  const axes = resolveAxes(allRows, datasetId, areaCol);
  if (!axes) return { ...empty, areaCount: areaValues.length };

  const { xAxis, yAxis, isTimeSeries, colorField } = axes;

  // Preferred per-area chart type from dataset metadata
  const preferredType = DATASET_META[datasetId]?.perAreaChartType ?? null;

  // ------------------------------------------------------------------
  // 1. Per-area charts
  // ------------------------------------------------------------------
  const perArea: DetectedChartConfig[] = [];
  for (const area of areaValues) {
    const areaRows = allRows.filter((r) => String(r[areaCol]) === area);
    if (areaRows.length === 0) continue;

    if (colorField) {
      // Has categories — sum per class, show as pie/bar
      const classSums = new Map<string, number>();
      for (const row of areaRows) {
        const cls = String(row[colorField]);
        const val = typeof row[yAxis] === "number" ? (row[yAxis] as number) : 0;
        classSums.set(cls, (classSums.get(cls) ?? 0) + val);
      }
      const pivotedData = [...classSums.entries()].map(([cls, val]) => ({
        [colorField]: cls,
        [yAxis]: val,
      }));
      const catType: DetectedChartType =
        preferredType ?? (pivotedData.length <= 10 ? "pie" : "bar");
      perArea.push({
        type: catType,
        xAxis: colorField,
        yAxis,
        pivotedData,
        label: `${datasetName} — ${area}`,
      });
    } else {
      // Time-series or simple
      const stripped = areaRows.map((r) => ({
        [xAxis]: r[xAxis],
        [yAxis]: r[yAxis],
      }));
      const agg = aggregateRows(stripped, xAxis, yAxis);
      const sorted = sortByX(agg, xAxis);
      const type: DetectedChartType =
        preferredType ?? (isTimeSeries && sorted.length > 5 ? "line" : "bar");
      perArea.push({
        type,
        xAxis,
        yAxis,
        pivotedData: sorted,
        label: `${datasetName} — ${area}`,
      });
    }
  }

  // ------------------------------------------------------------------
  // 2. Comparison chart — all areas on one chart
  // ------------------------------------------------------------------
  let comparison: DetectedChartConfig | null = null;

  // Determine if xAxis is categorical (e.g. land_type, driver) for
  // comparison and total chart layout decisions.
  const xAxisIsCategorical = isKnownCategorical(xAxis);

  if (isTimeSeries) {
    // Multi-line / stacked-bar: wide format { xAxis, Area1: val, Area2: val }
    const wideMap = new Map<string, Record<string, unknown>>();
    for (const row of allRows) {
      const xKey = String(row[xAxis]);
      if (!wideMap.has(xKey)) {
        wideMap.set(xKey, { [xAxis]: row[xAxis] });
      }
      const wide = wideMap.get(xKey)!;
      const area = String(row[areaCol]);
      const val = typeof row[yAxis] === "number" ? (row[yAxis] as number) : 0;
      wide[area] =
        typeof wide[area] === "number" ? (wide[area] as number) + val : val;
    }
    const compData = sortByX([...wideMap.values()], xAxis);

    comparison = {
      type: "stacked-bar",
      xAxis,
      yAxis: areaValues[0],
      pivotedData: compData,
      label: `${datasetName} — Area Comparison`,
    };
  } else if (xAxisIsCategorical) {
    // Categorical x-axis (e.g. land_type, driver): one bar per class,
    // stacked by area contribution.
    // Wide format: { [xAxis]: className, Area1: val, Area2: val }
    const wideMap = new Map<string, Record<string, unknown>>();
    for (const row of allRows) {
      const xKey = String(row[xAxis]);
      if (!wideMap.has(xKey)) {
        wideMap.set(xKey, { [xAxis]: row[xAxis] });
      }
      const wide = wideMap.get(xKey)!;
      const area = String(row[areaCol]);
      const val = typeof row[yAxis] === "number" ? (row[yAxis] as number) : 0;
      wide[area] =
        typeof wide[area] === "number" ? (wide[area] as number) + val : val;
    }

    comparison = {
      type: "stacked-bar",
      xAxis,
      yAxis: areaValues[0],
      pivotedData: [...wideMap.values()],
      label: `${datasetName} — Area Comparison`,
    };
  } else if (colorField && isKnownCategorical(colorField)) {
    // colorField is categorical (e.g. land_type, driver) but xAxis isn't —
    // use colorField as the stacked x-axis for a class-by-area comparison.
    const wideMap = new Map<string, Record<string, unknown>>();
    for (const row of allRows) {
      const key = String(row[colorField]);
      if (!wideMap.has(key)) {
        wideMap.set(key, { [colorField]: row[colorField] });
      }
      const wide = wideMap.get(key)!;
      const area = String(row[areaCol]);
      const val = typeof row[yAxis] === "number" ? (row[yAxis] as number) : 0;
      wide[area] =
        typeof wide[area] === "number" ? (wide[area] as number) + val : val;
    }

    comparison = {
      type: "stacked-bar",
      xAxis: colorField,
      yAxis: areaValues[0],
      pivotedData: [...wideMap.values()],
      label: `${datasetName} — Area Comparison`,
    };
  } else {
    // Simple metric — one bar per area (total value)
    const areaVals: Record<string, unknown>[] = areaValues.map((area) => {
      const rows = allRows.filter((r) => String(r[areaCol]) === area);
      let sum = 0;
      for (const r of rows) {
        const val = typeof r[yAxis] === "number" ? (r[yAxis] as number) : 0;
        sum += val;
      }
      return { area, [yAxis]: sum };
    });

    comparison = {
      type: "bar",
      xAxis: "area",
      yAxis,
      pivotedData: areaVals,
      label: `${datasetName} — Area Comparison`,
    };
  }

  // ------------------------------------------------------------------
  // 3. Total chart — summed across all areas
  // ------------------------------------------------------------------
  let total: DetectedChartConfig | null = null;

  if (isTimeSeries) {
    const stripped = allRows.map((r) => ({
      [xAxis]: r[xAxis],
      [yAxis]: r[yAxis],
    }));
    const agg = aggregateRows(stripped, xAxis, yAxis);
    const totalData = sortByX(agg, xAxis);
    total = {
      type: "bar",
      xAxis,
      yAxis,
      pivotedData: totalData,
      label: `${datasetName} — Combined Total`,
    };
  } else if (colorField) {
    // Explicit colorField: aggregate by colorField class across all areas
    const classSums = new Map<string, number>();
    for (const row of allRows) {
      const cls = String(row[colorField]);
      const val = typeof row[yAxis] === "number" ? (row[yAxis] as number) : 0;
      classSums.set(cls, (classSums.get(cls) ?? 0) + val);
    }
    const totalData = [...classSums.entries()].map(([cls, val]) => ({
      [colorField]: cls,
      [yAxis]: val,
    }));
    total = {
      type: totalData.length <= 10 ? "pie" : "bar",
      xAxis: colorField,
      yAxis,
      pivotedData: totalData,
      label: `${datasetName} — Combined Total`,
    };
  } else if (xAxisIsCategorical) {
    // Categorical x-axis: aggregate by class across all areas (e.g. SBTN,
    // TCL by driver) — same structure as colorField path but using xAxis.
    const classSums = new Map<string, number>();
    for (const row of allRows) {
      const cls = String(row[xAxis]);
      const val = typeof row[yAxis] === "number" ? (row[yAxis] as number) : 0;
      classSums.set(cls, (classSums.get(cls) ?? 0) + val);
    }
    const totalData = [...classSums.entries()].map(([cls, val]) => ({
      [xAxis]: cls,
      [yAxis]: val,
    }));
    total = {
      type: totalData.length <= 10 ? "pie" : "bar",
      xAxis,
      yAxis,
      pivotedData: totalData,
      label: `${datasetName} — Combined Total`,
    };
  } else {
    // Simple metric (e.g. tree cover area_ha, GHG net flux): stacked bar
    // showing each area's contribution. Negative values (removals) display
    // below zero on the y-axis.
    const totalRow: Record<string, unknown> = { label: datasetName };
    for (const area of areaValues) {
      const areaRows = allRows.filter((r) => String(r[areaCol]) === area);
      let sum = 0;
      for (const r of areaRows) {
        const val = typeof r[yAxis] === "number" ? (r[yAxis] as number) : 0;
        sum += val;
      }
      totalRow[area] = sum;
    }
    total = {
      type: "stacked-bar",
      xAxis: "label",
      yAxis: areaValues[0],
      pivotedData: [totalRow],
      label: `${datasetName} — Combined Total`,
    };
  }

  return { perArea, comparison, total, areaCount: areaValues.length };
}

// ---------------------------------------------------------------------------
// Fallback: generate from separate analytics items (one item per area)
// ---------------------------------------------------------------------------

function generateFromSeparateItems(
  analyticsItems: AnalyticsDataItem[],
  datasetId: number,
): MultiAreaChartSet {
  const empty: MultiAreaChartSet = {
    perArea: [],
    comparison: null,
    total: null,
    areaCount: 0,
  };

  // Group by area name from the item's aoi_names
  const areaToRows = new Map<string, Record<string, unknown>[]>();
  for (const item of analyticsItems) {
    const areaLabel = item.aoi_names.join(", ") || "Unknown";
    const rows = extractRows(item.data);
    const existing = areaToRows.get(areaLabel) ?? [];
    existing.push(...rows);
    areaToRows.set(areaLabel, existing);
  }

  if (areaToRows.size <= 1) return { ...empty, areaCount: areaToRows.size };

  // Rebuild as if we had an area column, then call the main function
  // by tagging each row with an "__area" column
  const taggedRows: Record<string, unknown>[] = [];
  for (const [area, rows] of areaToRows) {
    for (const row of rows) {
      taggedRows.push({ ...row, name: area });
    }
  }

  // Create a synthetic analytics item
  const syntheticItem: AnalyticsDataItem = {
    dataset_name: DATASETS[datasetId] ?? `Dataset ${datasetId}`,
    start_date: analyticsItems[0]?.start_date ?? "",
    end_date: analyticsItems[0]?.end_date ?? "",
    source_url: "",
    aoi_names: [...areaToRows.keys()],
    data: { data: taggedRows },
  };

  return generateMultiAreaCharts([syntheticItem], datasetId);
}
