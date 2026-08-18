import type { InsightWidget } from "@/app/types/chat";

export type NetFluxDetail = "full" | "categories" | "summary";
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
 * The net-flux insight is the only producer of this chart type, so the type
 * doubles as the discriminator for its bespoke chrome.
 */
export function isNetFluxWidget(widget: InsightWidget): boolean {
  return widget.type === "stacked-bar-with-line";
}

/** Net-flux line overlay: the signed total of whichever bars are shown. */
export const NET_FLUX_LINE_FIELD = "Net flux";

/** Bar rendered for the "net" measure — tinted by sign via `divergentColors`. */
const NET_MEASURE_FIELD = "Net source";

const NET_SOURCE_COLOR = "#8c510a";
const NET_SINK_COLOR = "#01665e";

export interface NetFluxSeriesSpec {
  /**
   * Data key, and the name shown in the tooltip. Unique within a variant —
   * Recharts requires distinct dataKeys, and the design's own tooltips already
   * disambiguate where its legend repeats a label (legend "Mineral soil" in
   * removals vs. tooltip "Mineral"; legend "Land use" twice vs. tooltip
   * "Land use Emissions"/"Land use Removals").
   */
  key: string;
  /** Legend label, which may repeat across the two groups. */
  label: string;
  color: string;
  group: NetFluxGroup;
  /** Full-detail keys summed to produce this series. */
  from: string[];
}

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
  legend: NetFluxLegend;
}

/**
 * Full-detail series in *stack* order: emissions from the zero line upward,
 * then removals from the zero line downward. Recharts stacks in declaration
 * order, and this order reproduces the design's plot exactly.
 */
const FULL_SERIES: NetFluxSeriesSpec[] = [
  {
    key: "Tree loss",
    label: "Tree loss",
    color: "#543005",
    group: "emissions",
    from: ["Tree loss"],
  },
  {
    key: "Trees rem. trees",
    label: "Trees remaining trees",
    color: "#8c510a",
    group: "emissions",
    from: ["Trees rem. trees"],
  },
  {
    key: "Non-trees rem. non-trees",
    label: "Non-trees remaining non-trees",
    color: "#bf812d",
    group: "emissions",
    from: ["Non-trees rem. non-trees"],
  },
  {
    key: "Mineral soil",
    label: "Mineral soil",
    color: "#dfc27d",
    group: "emissions",
    from: ["Mineral soil"],
  },
  {
    key: "Organic soil",
    label: "Organic soil",
    color: "#ebd9b0",
    group: "emissions",
    from: ["Organic soil"],
  },
  {
    key: "Cropland management (2020, static)",
    label: "Cropland management (2020, static)",
    color: HATCH_CROPLAND,
    group: "emissions",
    from: ["Cropland management (2020, static)"],
  },
  {
    key: "Livestock (2020, static)",
    label: "Livestock (2020, static)",
    color: HATCH_LIVESTOCK,
    group: "emissions",
    from: ["Livestock (2020, static)"],
  },
  {
    key: "Tree gain",
    label: "Tree gain",
    color: "#01665e",
    group: "removals",
    from: ["Tree gain"],
  },
  {
    key: "Trees remaining",
    label: "Trees remaining",
    color: "#35978f",
    group: "removals",
    from: ["Trees remaining"],
  },
  {
    key: "Non-trees",
    label: "Non-trees",
    color: "#80cdc1",
    group: "removals",
    from: ["Non-trees"],
  },
  {
    key: "Mineral",
    label: "Mineral soil",
    color: "#003c30",
    group: "removals",
    from: ["Mineral"],
  },
];

const CATEGORY_SERIES: NetFluxSeriesSpec[] = [
  {
    key: "Vegetation (emissions)",
    label: "Vegetation",
    color: "#8c510a",
    group: "emissions",
    from: ["Non-trees rem. non-trees", "Trees rem. trees", "Tree loss"],
  },
  {
    key: "Mineral soil",
    label: "Mineral soil",
    color: "#dfc27d",
    group: "emissions",
    from: ["Organic soil", "Mineral soil"],
  },
  {
    key: "Cropland management (2020, static)",
    label: "Cropland management (2020, static)",
    color: HATCH_CROPLAND,
    group: "emissions",
    from: ["Cropland management (2020, static)"],
  },
  {
    key: "Livestock (2020, static)",
    label: "Livestock (2020, static)",
    color: HATCH_LIVESTOCK,
    group: "emissions",
    from: ["Livestock (2020, static)"],
  },
  {
    key: "Vegetation (removals)",
    label: "Vegetation",
    color: "#01665e",
    group: "removals",
    from: ["Tree gain", "Trees remaining", "Non-trees"],
  },
  {
    key: "Soil",
    label: "Soil",
    color: "#80cdc1",
    group: "removals",
    from: ["Mineral"],
  },
];

const SUMMARY_SERIES: NetFluxSeriesSpec[] = [
  {
    key: "Land use Emissions",
    label: "Land use",
    color: "#8c510a",
    group: "emissions",
    from: [
      "Organic soil",
      "Mineral soil",
      "Non-trees rem. non-trees",
      "Trees rem. trees",
      "Tree loss",
    ],
  },
  {
    key: "Agriculture (static)",
    label: "Agriculture (2020, static)",
    color: HATCH_AGRICULTURE,
    group: "emissions",
    from: ["Livestock (2020, static)", "Cropland management (2020, static)"],
  },
  {
    key: "Land use Removals",
    label: "Land use",
    color: "#01665e",
    group: "removals",
    from: ["Tree gain", "Trees remaining", "Non-trees", "Mineral"],
  },
];

const DETAIL_SERIES: Record<NetFluxDetail, NetFluxSeriesSpec[]> = {
  full: FULL_SERIES,
  categories: CATEGORY_SERIES,
  summary: SUMMARY_SERIES,
};

/** Full-detail data keys — the shape the (dummy, and later real) API returns. */
export const NET_FLUX_FULL_DETAIL_FIELDS = FULL_SERIES.map((s) => s.key);

/** Colours for the full-detail series, used as the stored widget's colorMap. */
export const NET_FLUX_FULL_DETAIL_COLOR_MAP: Record<string, string> =
  Object.fromEntries(FULL_SERIES.map((s) => [s.key, s.color]));

export const NET_FLUX_DIVERGENT_COLORS = {
  positive: NET_SOURCE_COLOR,
  negative: NET_SINK_COLOR,
};

/** Label shown in the chart's subtitle for the active detail level. */
export const DETAIL_LABEL: Record<NetFluxDetail, string> = {
  full: "Full detail",
  categories: "Categories",
  summary: "Summary",
};

function sumRow(row: Record<string, unknown>, fields: string[]): number {
  return fields.reduce((sum, field) => sum + (Number(row[field]) || 0), 0);
}

/**
 * Emissions read top-of-stack first (the reverse of the stacking order) so the
 * legend runs in the same visual order as the bar segments; removals stack
 * downward, so their stacking order already matches. Both match the design.
 */
function buildLegend(specs: NetFluxSeriesSpec[]): NetFluxLegend {
  const toItem = (s: NetFluxSeriesSpec): NetFluxLegendItem => ({
    label: s.label,
    color: s.color,
  });
  return {
    layout: "grouped",
    emissions: specs
      .filter((s) => s.group === "emissions")
      .reverse()
      .map(toItem),
    removals: specs.filter((s) => s.group === "removals").map(toItem),
  };
}

/**
 * Derives the chart data, series, colours and legend for one DETAIL × MEASURE
 * combination from the single full-detail, gross-measure widget held in the
 * store. The net-flux line is always the arithmetic sum of the bars shown —
 * verified against the design's own tooltips, whose per-variant rows reproduce
 * the same net flux at every detail level.
 */
export function deriveNetFluxVariant(
  widget: InsightWidget,
  detail: NetFluxDetail,
  measure: NetFluxMeasure
): NetFluxVariant {
  const xAxis = widget.xAxis;
  const rows = Array.isArray(widget.data)
    ? (widget.data as Record<string, unknown>[])
    : [];

  if (measure === "net") {
    const data = rows.map((row) => {
      const net = sumRow(row, NET_FLUX_FULL_DETAIL_FIELDS);
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
      // Left empty so the divergent positive/negative tint drives the bars.
      colorMap: {},
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

  const specs = DETAIL_SERIES[detail];
  const seriesFields = specs.map((s) => s.key);
  const data = rows.map((row) => {
    const out: Record<string, unknown> = { [xAxis]: row[xAxis] };
    for (const spec of specs) out[spec.key] = sumRow(row, spec.from);
    out[NET_FLUX_LINE_FIELD] = sumRow(out, seriesFields);
    return out;
  });

  return {
    data,
    seriesFields,
    lineField: NET_FLUX_LINE_FIELD,
    colorMap: Object.fromEntries(specs.map((s) => [s.key, s.color])),
    legend: buildLegend(specs),
  };
}
