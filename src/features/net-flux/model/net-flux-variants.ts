import type { InsightWidget } from "@/app/types/chat";
import { niceTicks } from "@/src/shared/lib/chart-ticks";
import { lgmsClassLabel } from "@/src/shared/lib/lgms-labels";
import { mgToMt, FLUX_UNIT_COLUMN_SUFFIX } from "@/src/shared/lib/units";

export type NetFluxMeasure = "gross" | "net";
export type NetFluxGroup = "emissions" | "removals";

/**
 * SVG paint references for the fixed-2020 agriculture series, which the design
 * draws as diagonal hatching rather than a solid fill. The patterns themselves
 * are declared once by `NetFluxHatchDefs`; SVG paint references resolve
 * document-wide, so a `url(#…)` fill works from any chart on the page.
 */
export const HATCH_LIVESTOCK = "url(#net-flux-hatch-livestock)";
export const HATCH_CROPLAND = "url(#net-flux-hatch-cropland)";
/** Same swatch as livestock's — the summary roll-up's "agriculture" bucket
 * folds cropland+livestock together, and the design draws it in livestock's
 * colors, so this reuses that pattern rather than declaring an identical one. */
export const HATCH_AGRICULTURE = HATCH_LIVESTOCK;

/** True for a colour that is an SVG paint reference rather than a CSS colour. */
export function isPaintReference(color: string): boolean {
  return color.startsWith("url(");
}

/**
 * This slice renders the time-series LGMS charts, so the chart type doubles as
 * the discriminator for its bespoke card.
 */
export function isNetFluxWidget(widget: InsightWidget): boolean {
  return widget.type === "stacked-bar-with-line";
}

/** Net-flux line overlay: the signed total of the bars shown. */
export const NET_FLUX_LINE_FIELD = "Net flux";

/** Bar rendered for the "net" measure — tinted by sign. */
const NET_MEASURE_FIELD = "Net source";

/**
 * What the net bar reads as at each sign — the legend's two entries and the
 * tooltip's single row share these so they can never disagree.
 */
const NET_SOURCE_LABEL = "Net source";
const NET_SINK_LABEL = "Net sink";

const NET_SOURCE_COLOR = "#8c510a";
const NET_SINK_COLOR = "#01665e";

export const NET_FLUX_DIVERGENT_COLORS = {
  positive: NET_SOURCE_COLOR,
  negative: NET_SINK_COLOR,
};

/**
 * Display label per LGMS class. The six leaf classes mirror the backend's own
 * `LGMS_CLASS_LABELS` (`src/api/services/charts/lgms.py`); the aggregate levels
 * and the two agriculture classes it doesn't name are supplied here. Product
 * renames are not written into this table: `seriesLabel` applies them from the
 * shared `lgms-labels` module, which the tree chart reads too.
 */
const CLASS_LABELS: Record<string, string> = {
  tree_loss: "Tree loss",
  tree_gain: "Tree gain",
  trees_remaining_trees: "Trees remaining trees",
  // Renders as "Non-tree vegetation" — see `LGMS_CLASS_RENAMES`.
  non_trees_remaining_non_trees: "Non-trees remaining non-trees",
  mineral_soil: "Mineral soil",
  organic_soil: "Organic soil",
  // The agriculture classes are a fixed 2020 figure repeated across every year
  // (the same caveat the chart header's subtitle spells out), which the design
  // surfaces in the legend itself.
  cropland_management: "Cropland management (2020, static)",
  livestock: "Livestock (2020, static)",
  vegetation: "Vegetation",
  soil: "Soil",
  land_use: "Land use",
  agriculture: "Agriculture",
  cropland: "Cropland management (2020, static)",
};

/**
 * Shorter labels for the removals column. Previously this shortened
 * "Trees remaining trees" to "Trees remaining", but the legend should show
 * the full class name on both sides — the tooltip handles abbreviation
 * separately via `TOOLTIP_LABELS`.
 */
const REMOVALS_LABELS: Record<string, string> = {};

/**
 * Colour per series field, keyed by the backend's own field names. The backend
 * sets no `color_map`, so the palette from the design lives here.
 */
const SERIES_COLORS: Record<string, string> = {
  // Full detail — emissions, darkest at the zero line outward.
  tree_loss_emissions: "#543005",
  trees_remaining_trees_emissions: "#8c510a",
  non_trees_remaining_non_trees_emissions: "#bf812d",
  mineral_soil_emissions: "#dfc27d",
  organic_soil_emissions: "#ebd9b0",
  cropland_management_emissions: HATCH_CROPLAND,
  livestock_emissions: HATCH_LIVESTOCK,
  // Full detail — removals.
  tree_gain_removals: "#01665e",
  trees_remaining_trees_removals: "#35978f",
  non_trees_remaining_non_trees_removals: "#80cdc1",
  mineral_soil_removals: "#003c30",
  organic_soil_removals: "#003c30",
  // Category roll-up.
  vegetation_emissions: "#8c510a",
  soil_emissions: "#dfc27d",
  vegetation_removals: "#01665e",
  soil_removals: "#80cdc1",
  // Summary roll-up.
  land_use_emissions: "#8c510a",
  agriculture_emissions: HATCH_AGRICULTURE,
  land_use_removals: "#01665e",
};

export interface NetFluxLegendItem {
  label: string;
  color: string;
}

export interface NetFluxLegend {
  /** "grouped" = Emissions/Removals columns; "flat" = a single wrapped row. */
  layout: "grouped" | "flat";
  emissions: NetFluxLegendItem[];
  removals: NetFluxLegendItem[];
}

export interface NetFluxVariant {
  data: Record<string, unknown>[];
  seriesFields: string[];
  lineField: string;
  /** Per-series colours, consumed via the chart's `colorMap` override. */
  colorMap: Record<string, string>;
  /** Sign tint for the single-series "net" measure. */
  divergentColors: typeof NET_FLUX_DIVERGENT_COLORS;
  legend: NetFluxLegend;
  /**
   * Round-number y-axis ticks and the domain that holds them, so the axis reads
   * `1500 1000 500 0 -500` as the design draws it rather than recharts' compact
   * `1.6K`. Passed straight through to `ChartWidget`.
   */
  yTicks: number[];
  yDomain: [number, number];
}

/**
 * Vertical extent of a sign-stacked chart: positives stack up from zero and
 * negatives down, so each row's reach is the sum of each sign separately — not
 * the largest single value. Zero is always inside, and 4% padding keeps a
 * full-height bar off the plot edge.
 */
function stackDomain(
  rows: Record<string, unknown>[],
  fields: string[]
): [number, number] {
  let max = 0;
  let min = 0;
  for (const row of rows) {
    let positive = 0;
    let negative = 0;
    for (const field of fields) {
      const value = Number(row[field]);
      if (!Number.isFinite(value)) continue;
      if (value > 0) positive += value;
      else negative += value;
    }
    max = Math.max(max, positive);
    min = Math.min(min, negative);
  }
  const pad = Math.max(max - min, 1) * 0.04;
  return [min - pad, max + pad];
}

/**
 * Which side of the zero line a series belongs to. The backend names every
 * field `{class}_{emissions|removals}`, so the suffix is the grouping — no
 * per-field table needed.
 */
export function seriesGroup(field: string): NetFluxGroup | null {
  if (field.endsWith("_emissions")) return "emissions";
  if (field.endsWith("_removals")) return "removals";
  return null;
}

/**
 * Human label for a series field, derived from its class prefix and side:
 * the removals short form where there is one, else the class label with the
 * product's renames applied.
 */
export function seriesLabel(field: string): string {
  const group = seriesGroup(field);
  if (!group) return field;
  const className = field.slice(0, -(group.length + 1));
  if (group === "removals") {
    const short = REMOVALS_LABELS[className];
    if (short) return short;
  }
  return lgmsClassLabel(
    className,
    CLASS_LABELS[className] ?? className.replace(/_/g, " ")
  );
}

/**
 * Shorter still for the hover tooltip, which is about half the legend's width
 * and puts the value in its own right-hand column. The longest emissions label
 * needs it, and so do the two agriculture classes, which keep the "static"
 * caveat but drop the year — the chart header already dates it. The removals
 * column already has `REMOVALS_LABELS`.
 */
const TOOLTIP_LABELS: Record<string, string> = {
  trees_remaining_trees: "Trees rem. trees",
  cropland_management: "Cropland mgmt (static)",
  livestock: "Livestock (static)",
  cropland: "Cropland management (static)",
};

/** Human label for a series field as the hover tooltip prints it. */
export function tooltipSeriesLabel(field: string): string {
  const short = TOOLTIP_LABELS[seriesClass(field)];
  if (short) return short;
  return seriesLabel(field);
}

/**
 * Column name for a net-flux field in a downloaded CSV: unit-suffixed,
 * snake_case, independent of the field's on-screen label (`seriesLabel`) or
 * its in-app table/tooltip name (`NET_FLUX_LINE_FIELD` itself, "Net flux",
 * which this must not disturb since it's also what the tooltip and TableWidget
 * display).
 */
export function csvColumnName(field: string): string {
  if (field === NET_FLUX_LINE_FIELD) {
    return `land_net_flux_${FLUX_UNIT_COLUMN_SUFFIX}`;
  }
  if (seriesGroup(field)) return `${field}_${FLUX_UNIT_COLUMN_SUFFIX}`;
  return field; // x-axis field, or anything else — no known unit
}

/** One rendered line of the hover tooltip: swatch, label, value. */
export interface NetFluxTooltipRow {
  /** The series field the row was read from. */
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * The tooltip's closing line: the sum of the rows above it, printed bold so
 * it reads as a total and not as one more series.
 */
export interface NetFluxTooltipTotal {
  label: string;
  value: number;
  /** Swatch colour — the net measure tints its total by sign like its bar. */
  color?: string;
}

export interface NetFluxTooltipModel {
  rows: NetFluxTooltipRow[];
  /**
   * The net-flux line's own value, which the design prints below a rule; under
   * the net measure it is the only line, labelled by sign. Null only when the
   * payload carried no line.
   */
  total: NetFluxTooltipTotal | null;
}

/** What recharts hands a tooltip content renderer, narrowed to what's used. */
export interface NetFluxTooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number;
  color?: string;
}

/** The series a tooltip entry belongs to, as recharts names it. */
function entryField(entry: NetFluxTooltipEntry): string {
  return String(entry.dataKey ?? entry.name ?? "");
}

/**
 * Recharts hands the tooltip its entries in the order the series *registered*
 * with its store, not the order the bars are declared and stacked in, and a
 * bar that re-renders on its own re-registers at the end. Sorting by the
 * declared order pins the rows to the stack regardless; entries not in it (the
 * net-flux line) sort last, keeping their relative order.
 */
function inStackOrder(
  payload: NetFluxTooltipEntry[],
  seriesOrder: readonly string[]
): NetFluxTooltipEntry[] {
  const rank = new Map(seriesOrder.map((field, index) => [field, index]));
  const at = (entry: NetFluxTooltipEntry) =>
    rank.get(entryField(entry)) ?? seriesOrder.length;
  return [...payload].sort((a, b) => at(a) - at(b));
}

/**
 * The net measure's one tooltip line. Its bar and the net-flux line carry the
 * same value, so printing both read as a duplicate in review; the bar wins,
 * labelled and tinted by sign exactly as the flat legend names it, so the
 * hover ties back to the legend rather than to a "Net flux" total the
 * measure has no breakdown for. Zero counts as a source, as the header does.
 */
function netMeasureTotal(value: number): NetFluxTooltipTotal {
  const sink = value < 0;
  return {
    label: sink ? NET_SINK_LABEL : NET_SOURCE_LABEL,
    value,
    color: sink ? NET_SINK_COLOR : NET_SOURCE_COLOR,
  };
}

/**
 * Tooltip rows for one hovered x-value, in the design's own order: emissions
 * top-of-stack first (so the list reads down the bar as drawn), then removals
 * in stacking order — the same order `buildLegend` gives the legend below the
 * chart. Every bar segment drawn gets a row of its own, cropland and livestock
 * included, so the tooltip, the stack and the legend list the same series in
 * the same swatches. Series the active measure doesn't draw simply aren't in
 * `payload`, so the row list follows the Measure/Detail the user picked
 * without being told which one it is, and a series whose value is 0 that year
 * draws no segment, so it gets no row either. Under the net measure the
 * payload holds only the collapsed bar and the line, and the model reduces to
 * a sign-labelled total with no rows (see `netMeasureTotal`). `seriesOrder` is
 * the series' declaration order, i.e. the stacking order (see `inStackOrder`
 * for why the payload's own order won't do).
 */
export function netFluxTooltipRows(
  payload: NetFluxTooltipEntry[],
  seriesOrder: readonly string[]
): NetFluxTooltipModel {
  const emissions: NetFluxTooltipRow[] = [];
  const removals: NetFluxTooltipRow[] = [];
  let net: number | null = null;
  let netMeasure: number | null = null;

  for (const entry of inStackOrder(payload, seriesOrder)) {
    const field = entryField(entry);
    const value = entry.value;
    if (field === NET_FLUX_LINE_FIELD) {
      net = typeof value === "number" ? value : null;
      continue;
    }
    if (field === NET_MEASURE_FIELD) {
      netMeasure = typeof value === "number" ? value : null;
      continue;
    }
    const group = seriesGroup(field);
    if (!group || typeof value !== "number") continue;

    const row: NetFluxTooltipRow = {
      key: field,
      label: tooltipSeriesLabel(field),
      value,
      color: entry.color ?? SERIES_COLORS[field] ?? "currentColor",
    };
    (group === "emissions" ? emissions : removals).push(row);
  }

  // Not filtered on zero: a bar at 0 is still the year's answer under the net
  // measure, where there is nothing else to show.
  if (netMeasure != null) {
    return { rows: [], total: netMeasureTotal(netMeasure) };
  }

  return {
    rows: [...emissions.reverse(), ...removals].filter(
      (row) => row.value !== 0
    ),
    total: net == null ? null : { label: NET_FLUX_LINE_FIELD, value: net },
  };
}

/**
 * Class → table-column group, independent of Full/Category/Summary detail
 * level. The backend orders fields emissions-then-removals, which splits a
 * class's own emissions and removals columns apart from its sibling classes
 * (e.g. vegetation's `tree_gain_removals` lands after every agriculture
 * column) — this groups by class family instead, so the table reads
 * vegetation, then soil, then agriculture, as the design asks.
 */
const COLUMN_GROUP: Record<string, number> = {
  tree_loss: 0,
  tree_gain: 0,
  trees_remaining_trees: 0,
  non_trees_remaining_non_trees: 0,
  vegetation: 0,
  land_use: 0, // Summary combines vegetation+soil into one class.
  mineral_soil: 1,
  organic_soil: 1,
  soil: 1,
  cropland_management: 2,
  livestock: 2,
  agriculture: 2,
};

/** Table column order for a net-flux variant's fields (stable within a group). */
export function tableColumnOrder(fields: string[]): string[] {
  return [...fields]
    .map((field, index) => ({ field, index }))
    .sort((a, b) => {
      const groupA = COLUMN_GROUP[seriesClass(a.field)] ?? 99;
      const groupB = COLUMN_GROUP[seriesClass(b.field)] ?? 99;
      return groupA !== groupB ? groupA - groupB : a.index - b.index;
    })
    .map(({ field }) => field);
}

function seriesClass(field: string): string {
  const group = seriesGroup(field);
  return group ? field.slice(0, -(group.length + 1)) : field;
}

/**
 * Table display config for a derived variant: columns grouped
 * vegetation → soil → agriculture, the net-flux line bolded to read as the
 * total, and — for the "net" measure — the `NET_MEASURE_FIELD` bar column
 * hidden, since it duplicates the net-flux column exactly (both are the same
 * summed value; showing both was a redundant pair of categories in review).
 */
export function netFluxTableProps(
  variant: NetFluxVariant,
  xAxis: string,
  measure: NetFluxMeasure
): {
  columnOrder: string[];
  hiddenColumns: string[];
  boldColumns: string[];
} {
  return {
    columnOrder: [
      xAxis,
      ...tableColumnOrder(variant.seriesFields),
      variant.lineField,
    ],
    hiddenColumns: measure === "net" ? [NET_MEASURE_FIELD] : [],
    boldColumns: [variant.lineField],
  };
}

function seriesColor(field: string, index: number, total: number): string {
  const known = SERIES_COLORS[field];
  if (known) return known;
  // Unknown class (the backend grew a new one): fall back to a ramp in the
  // right family so the chart still reads as emissions-up / removals-down.
  const ramp =
    seriesGroup(field) === "removals"
      ? ["#01665e", "#35978f", "#80cdc1", "#003c30"]
      : ["#543005", "#8c510a", "#bf812d", "#dfc27d", "#ebd9b0"];
  return ramp[(total > 0 ? index : 0) % ramp.length];
}

function sumRow(row: Record<string, unknown>, fields: string[]): number {
  return fields.reduce((sum, field) => sum + (Number(row[field]) || 0), 0);
}

/**
 * The backend's flux fields (`{class}_emissions` / `{class}_removals`) arrive
 * in Mg (metric tons), unconverted; the design's axis and headline are
 * labelled "Mt CO2e/yr", so every series field is scaled to megatonnes here,
 * before either the bars or the derived net-flux line read it. A field that
 * is absent or non-numeric on a given row (the metric doesn't apply there)
 * passes through untouched rather than becoming a fabricated 0.
 */
function scaleRowsToMegatonnes(
  rows: Record<string, unknown>[],
  fields: string[]
): Record<string, unknown>[] {
  return rows.map((row) => {
    const scaled: Record<string, unknown> = { ...row };
    for (const field of fields) {
      const raw = row[field];
      if (typeof raw === "number" && Number.isFinite(raw)) {
        scaled[field] = mgToMt(raw);
      }
    }
    return scaled;
  });
}

/**
 * Emissions read top-of-stack first (the reverse of stacking order) so the
 * legend runs in the same visual order as the bar segments; removals stack
 * downward, so their order already matches. Both match the design.
 */
function buildLegend(fields: string[]): NetFluxLegend {
  const item = (field: string, i: number): NetFluxLegendItem => ({
    label: seriesLabel(field),
    color: seriesColor(field, i, fields.length),
  });
  const emissions = fields.filter((f) => seriesGroup(f) === "emissions");
  const removals = fields.filter((f) => seriesGroup(f) === "removals");
  return {
    layout: "grouped",
    emissions: emissions.map(item).reverse(),
    removals: removals.map(item),
  };
}

/**
 * The rows a net-flux widget renders as, for the given measure: gross keeps
 * every series field plus the summed net-flux line; net collapses to a single
 * signed bar. Shared by the chart (scaled to Mt, via `deriveNetFluxVariant`)
 * and the CSV download (left in Mg, via `netFluxCsvRows`) — only the caller's
 * choice of already-scaled or raw `rows` differs.
 */
function buildFluxRows(
  rows: Record<string, unknown>[],
  fields: string[],
  xAxis: string,
  measure: NetFluxMeasure
): Record<string, unknown>[] {
  if (measure === "net") {
    return rows.map((row) => {
      const net = sumRow(row, fields);
      return {
        [xAxis]: row[xAxis],
        [NET_MEASURE_FIELD]: net,
        [NET_FLUX_LINE_FIELD]: net,
      };
    });
  }
  return rows.map((row) => ({
    ...row,
    [NET_FLUX_LINE_FIELD]: sumRow(row, fields),
  }));
}

/** Series fields to sum for a net-flux widget, in the backend's own order. */
function netFluxSeriesFields(widget: InsightWidget): string[] {
  return (widget.seriesFields ?? []).filter((f) => seriesGroup(f) !== null);
}

/**
 * CSV-download rows for a net-flux widget: the same fields and net-flux total
 * as the chart, but left in Mg (metric tons) rather than scaled to Mt — the
 * download should always report the raw unit, regardless of what the chart
 * displays (PZB-1402).
 */
export function netFluxCsvRows(
  widget: InsightWidget,
  measure: NetFluxMeasure
): Record<string, unknown>[] {
  const rawRows = Array.isArray(widget.data)
    ? (widget.data as Record<string, unknown>[])
    : [];
  const fields = netFluxSeriesFields(widget);
  return buildFluxRows(rawRows, fields, widget.xAxis, measure);
}

/**
 * Narrows one of the backend's three time-series charts to the active measure.
 *
 * The detail level is no longer derived here: project-zeno's `LGMSChartGenerator`
 * ships Full detail / Category / Summary as three separate charts, so this only
 * decides gross-vs-net and supplies the palette, labels and the net-flux line
 * (which the backend does not send as a column).
 */
export function deriveNetFluxVariant(
  widget: InsightWidget,
  measure: NetFluxMeasure
): NetFluxVariant {
  const xAxis = widget.xAxis;
  const rawRows = Array.isArray(widget.data)
    ? (widget.data as Record<string, unknown>[])
    : [];
  // Trust the backend's order: emissions first, then removals, which is the
  // stacking order the design draws.
  const fields = netFluxSeriesFields(widget);
  const rows = scaleRowsToMegatonnes(rawRows, fields);
  const data = buildFluxRows(rows, fields, xAxis, measure);

  if (measure === "net") {
    const yDomain = stackDomain(data, [NET_MEASURE_FIELD]);
    return {
      data,
      seriesFields: [NET_MEASURE_FIELD],
      lineField: NET_FLUX_LINE_FIELD,
      // Left empty so the divergent tint drives the single bar.
      colorMap: {},
      divergentColors: NET_FLUX_DIVERGENT_COLORS,
      yDomain,
      yTicks: niceTicks(yDomain),
      legend: {
        layout: "flat",
        emissions: [
          { label: `${NET_SOURCE_LABEL} (+)`, color: NET_SOURCE_COLOR },
          { label: `${NET_SINK_LABEL} (−)`, color: NET_SINK_COLOR },
        ],
        removals: [],
      },
    };
  }

  const yDomain = stackDomain(data, fields);

  return {
    data,
    seriesFields: fields,
    lineField: NET_FLUX_LINE_FIELD,
    colorMap: Object.fromEntries(
      fields.map((f, i) => [f, seriesColor(f, i, fields.length)])
    ),
    divergentColors: NET_FLUX_DIVERGENT_COLORS,
    yDomain,
    yTicks: niceTicks(yDomain),
    legend: buildLegend(fields),
  };
}
