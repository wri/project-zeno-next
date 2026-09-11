import type { InsightWidget } from "@/app/types/chat";
import { niceTicks } from "@/src/shared/lib/chart-ticks";
import { mgToMt } from "@/src/shared/lib/units";

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
 * and the two agriculture classes it doesn't name are supplied here.
 */
const CLASS_LABELS: Record<string, string> = {
  tree_loss: "Tree loss",
  tree_gain: "Tree gain",
  trees_remaining_trees: "Trees remaining trees",
  non_trees_remaining_non_trees: "Non-trees remaining non-trees",
  mineral_soil: "Mineral soil",
  organic_soil: "Organic soil",
  // The agriculture classes are a fixed 2020 figure repeated across every year
  // (the same caveat the card's footnote spells out), which the design surfaces
  // in the legend itself.
  cropland: "Cropland management (2020, static)",
  livestock: "Livestock (2020, static)",
  vegetation: "Vegetation",
  soil: "Soil",
  land_use: "Land use",
  agriculture: "Agriculture",
};

/**
 * Shorter labels for the removals column. The two columns sit side by side, so
 * the design lets the removals side drop the qualifier its emissions twin needs
 * ("Mineral" beside "Mineral soil") — the column heading already supplies it.
 */
const REMOVALS_LABELS: Record<string, string> = {
  trees_remaining_trees: "Trees remaining",
  non_trees_remaining_non_trees: "Non-trees",
  mineral_soil: "Mineral",
};

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
  cropland_emissions: HATCH_CROPLAND,
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

/** Human label for a series field, derived from its class prefix and side. */
export function seriesLabel(field: string): string {
  const group = seriesGroup(field);
  if (!group) return field;
  const className = field.slice(0, -(group.length + 1));
  if (group === "removals") {
    const short = REMOVALS_LABELS[className];
    if (short) return short;
  }
  return CLASS_LABELS[className] ?? className.replace(/_/g, " ");
}

/**
 * Shorter still for the hover tooltip, which is about half the legend's width
 * and puts the value in its own right-hand column. Only the two longest
 * emissions labels need it; the removals column already has `REMOVALS_LABELS`.
 */
const TOOLTIP_LABELS: Record<string, string> = {
  trees_remaining_trees: "Trees rem. trees",
  non_trees_remaining_non_trees: "Non-trees rem. non-trees",
};

/** Human label for a series field as the hover tooltip prints it. */
export function tooltipSeriesLabel(field: string): string {
  const short = TOOLTIP_LABELS[seriesClass(field)];
  // The removals side is already abbreviated by `seriesLabel`, and its short
  // forms ("Trees remaining") differ from these — so only override emissions.
  if (short && seriesGroup(field) === "emissions") return short;
  return seriesLabel(field);
}

/**
 * Cropland and livestock are the same fixed-2020 figure under two names (see
 * `CLASS_LABELS`), drawn in near-identical hatching and sat side by side in
 * the stack. The design reads them as one bar and gives them one tooltip row.
 */
const AGRICULTURE_CLASSES = new Set(["cropland", "livestock"]);
const AGRICULTURE_TOOLTIP_LABEL = "Agriculture (static)";

/** One rendered line of the hover tooltip: swatch, label, value. */
export interface NetFluxTooltipRow {
  /** Stable across re-renders — the merged agriculture row has no single field. */
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface NetFluxTooltipModel {
  rows: NetFluxTooltipRow[];
  /**
   * The net-flux line's own value, which the design prints below a rule. Null
   * under the net measure, whose single sign-labelled row already is the total.
   */
  net: number | null;
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
 * The net measure's one tooltip row. Its bar and the net-flux line carry the
 * same value, so printing both read as a duplicate in review; the bar wins,
 * labelled and tinted by sign exactly as the flat legend names it, so the
 * hover ties back to the legend rather than to a "Net flux" total the
 * measure has no breakdown for. Zero counts as a source, as the header does.
 */
function netMeasureTooltipRow(value: number): NetFluxTooltipRow {
  const sink = value < 0;
  return {
    key: NET_MEASURE_FIELD,
    label: sink ? NET_SINK_LABEL : NET_SOURCE_LABEL,
    value,
    color: sink ? NET_SINK_COLOR : NET_SOURCE_COLOR,
  };
}

/**
 * Tooltip rows for one hovered x-value, in the design's own order: emissions
 * top-of-stack first (so the list reads down the bar as drawn), then removals
 * in stacking order — the same order `buildLegend` gives the legend below the
 * chart. Agriculture's two classes fold into one row where the first of them
 * falls. Series the active measure doesn't draw simply aren't in `payload`, so
 * the row list follows the Measure/Detail the user picked without being told
 * which one it is, and a series whose value is 0 that year draws no segment,
 * so it gets no row either. Under the net measure the payload holds only the
 * collapsed bar and the line, and the model reduces to one sign-labelled row
 * (see `netMeasureTooltipRow`). `seriesOrder` is the series' declaration
 * order, i.e. the stacking order (see `inStackOrder` for why the payload's
 * own order won't do).
 */
export function netFluxTooltipRows(
  payload: NetFluxTooltipEntry[],
  seriesOrder: readonly string[]
): NetFluxTooltipModel {
  const emissions: NetFluxTooltipRow[] = [];
  const removals: NetFluxTooltipRow[] = [];
  let agriculture: NetFluxTooltipRow | null = null;
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

    if (AGRICULTURE_CLASSES.has(seriesClass(field))) {
      if (agriculture) {
        agriculture.value += value;
      } else {
        agriculture = {
          key: "agriculture",
          label: AGRICULTURE_TOOLTIP_LABEL,
          value,
          color: HATCH_AGRICULTURE,
        };
        emissions.push(agriculture);
      }
      continue;
    }

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
    return { rows: [netMeasureTooltipRow(netMeasure)], net: null };
  }

  // Filtered after folding so agriculture only disappears when both of its
  // classes are 0, not when one of them is.
  return {
    rows: [...emissions.reverse(), ...removals].filter(
      (row) => row.value !== 0
    ),
    net,
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
  cropland: 2,
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
  const fields = (widget.seriesFields ?? []).filter(
    (f) => seriesGroup(f) !== null
  );
  const rows = scaleRowsToMegatonnes(rawRows, fields);

  if (measure === "net") {
    const data = rows.map((row) => {
      const net = sumRow(row, fields);
      return {
        [xAxis]: row[xAxis],
        [NET_MEASURE_FIELD]: net,
        [NET_FLUX_LINE_FIELD]: net,
      };
    });
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

  const data = rows.map((row) => ({
    ...row,
    [NET_FLUX_LINE_FIELD]: sumRow(row, fields),
  }));
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
