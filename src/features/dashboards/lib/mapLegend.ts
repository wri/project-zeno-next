import { buildParams } from "@/app/components/legend/useLegendHook";
import {
  CONTEXT_LAYER_METADATA,
  DATASET_CARD_BY_ID,
} from "@/app/constants/datasets";
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
  info: string | undefined;
}

/** A dashboard map's legend, settled once from the widget layer and its dataset card. */
export interface MapLegend {
  title: string;
  info: string;
  note: string;
  symbology: MapLegendClasses | MapLegendScale;
  /** The layer's settings as one line, e.g. "YEARS 2001–25 · CANOPY 30%". Empty when none. */
  params: string;
  context: MapLegendContext | null;
}

/**
 * The legend for a dataset map widget, or null when the layer has no dataset
 * card with a legend (imagery widgets).
 */
export function mapLegendFor(layer: MapWidgetLayer): MapLegend | null {
  const card =
    layer.datasetId != null ? DATASET_CARD_BY_ID[layer.datasetId] : undefined;
  if (!card?.legend) return null;
  const { title, info, note, type, items = [], color, unit } = card.legend;

  const symbology: MapLegend["symbology"] =
    type === "sequential" || type === "divergent"
      ? {
          kind: type,
          colors: items.length > 0 ? items.map((i) => i.color) : [color],
          minLabel: items[0]?.label ?? "",
          maxLabel: items[items.length - 1]?.label ?? "",
          unit: unit ?? "",
        }
      : {
          kind: "classes",
          classes:
            items.length > 0
              ? items.map((i) => ({ label: i.label ?? "", color: i.color }))
              : [{ label: title, color }],
        };

  const params = buildParams(
    layer.parameters ?? {},
    buildYearParam(layer.startDate, layer.endDate)
  )
    .map((p) => `${p.label} ${p.value}`)
    .join(" · ");

  let context: MapLegendContext | null = null;
  if (layer.contextTileUrl && layer.contextLayerName) {
    const ctxLegend = CONTEXT_LAYER_METADATA[layer.contextLayerName]?.legend;
    context = {
      title: ctxLegend?.title ?? layer.contextLayerName,
      color: ctxLegend?.items?.[0]?.color ?? ctxLegend?.color ?? "#888",
      info: ctxLegend?.info,
    };
  }

  return { title, info, note, symbology, params, context };
}
