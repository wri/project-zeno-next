import type { InsightWidget } from "@/app/types/chat";

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
export const HATCH_AGRICULTURE = "url(#net-flux-hatch-agriculture)";

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
  cropland: "Crop management",
  livestock: "Livestock",
  vegetation: "Vegetation",
  soil: "Soil",
  land_use: "Land use",
  agriculture: "Agriculture",
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

/** Human label for a series field, derived from its class prefix. */
export function seriesLabel(field: string): string {
  const group = seriesGroup(field);
  if (!group) return field;
  const className = field.slice(0, -(group.length + 1));
  return CLASS_LABELS[className] ?? className.replace(/_/g, " ");
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
  const rows = Array.isArray(widget.data)
    ? (widget.data as Record<string, unknown>[])
    : [];
  // Trust the backend's order: emissions first, then removals, which is the
  // stacking order the design draws.
  const fields = (widget.seriesFields ?? []).filter(
    (f) => seriesGroup(f) !== null
  );

  if (measure === "net") {
    const data = rows.map((row) => {
      const net = sumRow(row, fields);
      return {
        [xAxis]: row[xAxis],
        [NET_MEASURE_FIELD]: net,
        [NET_FLUX_LINE_FIELD]: net,
      };
    });
    return {
      data,
      seriesFields: [NET_MEASURE_FIELD],
      lineField: NET_FLUX_LINE_FIELD,
      // Left empty so the divergent tint drives the single bar.
      colorMap: {},
      divergentColors: NET_FLUX_DIVERGENT_COLORS,
      legend: {
        layout: "flat",
        emissions: [
          { label: "Net source (+)", color: NET_SOURCE_COLOR },
          { label: "Net sink (−)", color: NET_SINK_COLOR },
        ],
        removals: [],
      },
    };
  }

  const data = rows.map((row) => ({
    ...row,
    [NET_FLUX_LINE_FIELD]: sumRow(row, fields),
  }));

  return {
    data,
    seriesFields: fields,
    lineField: NET_FLUX_LINE_FIELD,
    colorMap: Object.fromEntries(
      fields.map((f, i) => [f, seriesColor(f, i, fields.length)])
    ),
    divergentColors: NET_FLUX_DIVERGENT_COLORS,
    legend: buildLegend(fields),
  };
}
