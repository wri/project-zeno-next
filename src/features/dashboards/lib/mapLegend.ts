import { buildParams } from "@/app/components/legend/useLegendHook";
import {
  CONTEXT_LAYER_METADATA,
  DATASET_CARDS,
} from "@/app/constants/datasets";
import { buildYearParam } from "@/app/utils/formatYearRange";
import type { MapWidgetLayer } from "./mapWidgets";

/** One colour class in a dashboard map's legend. */
export interface MapLegendClass {
  label: string;
  color: string;
}

/** A colour scale: low to high (sequential) or either side of zero (divergent). */
export interface MapLegendScale {
  kind: "sequential" | "divergent";
  colors: string[];
  minLabel: string;
  maxLabel: string;
  unit: string | undefined;
}

/** The context layer the data sits within, e.g. "Primary Forests (2001)". */
export interface MapLegendContext {
  title: string;
  color: string;
  info: string | undefined;
}

/**
 * A dashboard map's legend, settled once from the widget layer and its
 * dataset card. A legend has colour classes or a colour scale, never both.
 */
export interface MapLegend {
  title: string;
  info: string;
  note: string;
  /** Empty when the legend is a scale. */
  classes: MapLegendClass[];
  scale: MapLegendScale | null;
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
    layer.datasetId != null
      ? DATASET_CARDS.find((d) => d.dataset_id === layer.datasetId)
      : undefined;
  if (!card?.legend) return null;
  const { title, info, note, type, items = [], color, unit } = card.legend;

  const scale: MapLegendScale | null =
    type === "sequential" || type === "divergent"
      ? {
          kind: type,
          colors: items.length > 0 ? items.map((i) => i.color) : [color],
          minLabel: items[0]?.label ?? "",
          maxLabel: items[items.length - 1]?.label ?? "",
          unit: unit ?? undefined,
        }
      : null;

  const classes: MapLegendClass[] = scale
    ? []
    : items.length > 0
      ? items.map((i) => ({ label: i.label ?? "", color: i.color }))
      : [{ label: title, color }];

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

  return { title, info, note, classes, scale, params, context };
}
