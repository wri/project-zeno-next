import {
  buildParams,
  contextLegendFor,
  legendSymbology,
} from "@/app/components/legend/legendModel";
import { DATASET_CARD_BY_ID } from "@/app/constants/datasets";
import { buildYearParam } from "@/app/utils/formatYearRange";
import type { MapWidgetLayer } from "./mapWidgets";

/** One colour class in a dashboard map's legend. */
export interface MapLegendClass {
  label: string;
  color: string;
}

/** Colour classes, e.g. alert confidence levels or land cover types. */
export interface MapLegendClasses {
  kind: "classes";
  classes: MapLegendClass[];
}

/** A colour scale: low to high (sequential) or either side of zero (divergent). */
export interface MapLegendScale {
  kind: "sequential" | "divergent";
  colors: string[];
  minLabel: string;
  maxLabel: string;
  /** Empty when the dataset has none. */
  unit: string;
}

/** The context layer the data sits within, e.g. "Primary Forests (2001)". */
export interface MapLegendContext {
  title: string;
  color: string;
  info?: string;
}

/** A dashboard map's legend, settled once from the widget layer and its dataset card. */
export interface MapLegend {
  title: string;
  info: string;
  note: string;
  symbology: MapLegendClasses | MapLegendScale;
  /** The layer's settings as one line, e.g. "YEARS 2001–25 · CANOPY 30%". Empty when none. */
  params: string;
  context?: MapLegendContext;
}

/**
 * The legend for a dataset map widget, or null when the layer has no dataset
 * card with a legend (imagery widgets).
 */
export function mapLegendFor(layer: MapWidgetLayer): MapLegend | null {
  const card =
    layer.datasetId != null ? DATASET_CARD_BY_ID[layer.datasetId] : undefined;
  if (!card?.legend) return null;
  const { title, info, note } = card.legend;
  const s = legendSymbology(card.legend);
  const symbology: MapLegend["symbology"] =
    "classes" in s ? { kind: "classes", classes: s.classes } : s;

  const params = buildParams(
    layer.parameters ?? {},
    buildYearParam(layer.startDate, layer.endDate)
  )
    .map((p) => `${p.label} ${p.value}`)
    .join(" · ");

  const context = layer.context && contextLegendFor(layer.context.name);

  return { title, info, note, symbology, params, context };
}
