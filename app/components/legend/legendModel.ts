import type { LegendParam } from "@/app/components/legend/types";
import { CONTEXT_LAYER_METADATA } from "@/app/constants/datasets";
import { formatCanopyThreshold } from "@/app/utils/formatCanopyThreshold";
import {
  buildDatesParam,
  buildYearParam,
  formatDateRange,
} from "@/app/utils/formatYearRange";
import type {
  DatasetCardConfig,
  DatasetLegendConfig,
} from "@/app/constants/datasets";

export interface LegendClass {
  label: string;
  color: string;
}

/**
 * A dataset legend's symbology, parsed once. `symbol` and `categorical` both
 * list classes but the explorer draws them differently, so they stay apart.
 */
export type LegendSymbology =
  | { kind: "symbol" | "categorical"; classes: LegendClass[]; unit: string }
  | {
      kind: "sequential" | "divergent";
      colors: string[];
      minLabel: string;
      maxLabel: string;
      unit: string;
    };

/** Reads a legend config's symbology. `unit` is "" when the dataset has none. */
export function legendSymbology(legend: DatasetLegendConfig): LegendSymbology {
  const { type, items = [], color } = legend;
  const unit = legend.unit ?? "";

  if (type === "sequential" || type === "divergent") {
    return {
      kind: type,
      colors: items.length > 0 ? items.map((i) => i.color) : [color],
      minLabel: items[0]?.label ?? "",
      maxLabel: items[items.length - 1]?.label ?? "",
      unit,
    };
  }
  return {
    kind: type,
    classes: items.map((i) => ({ label: i.label ?? "", color: i.color })),
    unit,
  };
}

/**
 * A context layer's legend entry: its title, a swatch colour (the first
 * item's, else the legend's own) and its info text. Unknown names fall back
 * to the name and a grey swatch.
 */
export function contextLegendFor(name: string): {
  title: string;
  color: string;
  info?: string;
} {
  const legend = CONTEXT_LAYER_METADATA[name]?.legend;
  return {
    title: legend?.title ?? name,
    color: legend?.items?.[0]?.color ?? legend?.color ?? "#888",
    info: legend?.info,
  };
}

// Maps internal parameter keys to the badge label shown in the legend.
const PARAMETER_LABELS: Record<string, string> = {
  canopy_cover: "CANOPY",
};

// Maps internal parameter keys to a formatting function that produces the value
// string. Shares the canopy formatter with the insights CANOPY chip.
const PARAMETER_FORMATTERS: Record<string, (v: unknown) => string> = {
  canopy_cover: (v) => formatCanopyThreshold(v as number),
};

/**
 * The date chip for a dataset layer: YEAR(S) by default, or DATES with full
 * dates for a card whose `legendPeriod` is "days". Undefined when the layer
 * has no complete date range.
 */
function buildPeriodParam(
  card: Pick<DatasetCardConfig, "legendPeriod">,
  startDate: string | undefined,
  endDate: string | undefined
): LegendParam | undefined {
  if (card.legendPeriod !== "days") return buildYearParam(startDate, endDate);
  const value = startDate && endDate && formatDateRange(startDate, endDate);
  return value ? buildDatesParam(value) : undefined;
}

/**
 * Converts a layer's raw parameters object into structured LegendParam chips.
 * Each entry becomes a { label, value } pair rendered as a badge in the card.
 * The date chip comes first, from the layer's date range per the card.
 * Shared by the explorer legend and `mapLegendFor`, the dashboard map legend,
 * which reads widget layers instead of mapStore layers.
 */
export function buildParams(
  card: Pick<DatasetCardConfig, "legendPeriod">,
  layer: {
    parameters?: Record<string, unknown>;
    startDate?: string;
    endDate?: string;
  }
): LegendParam[] {
  const result: LegendParam[] = [];
  const periodParam = buildPeriodParam(card, layer.startDate, layer.endDate);

  if (periodParam) {
    result.push(periodParam);
  }

  for (const [k, v] of Object.entries(layer.parameters ?? {})) {
    if (v === null || v === undefined || v === "") continue;
    const label = PARAMETER_LABELS[k] ?? k.toUpperCase();
    const format = PARAMETER_FORMATTERS[k];
    result.push({ label, value: format ? format(v) : String(v) });
  }

  return result;
}
