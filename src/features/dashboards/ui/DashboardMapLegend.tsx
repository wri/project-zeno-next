"use client";

import { Text } from "@chakra-ui/react";

import {
  imageryLayerTitle,
  imageryLegendCloudNote,
  imageryLegendInfo,
  imageryLegendParams,
} from "@/app/components/legend/imageryLegend";
import { Legend } from "@/app/components/legend/Legend";
import type {
  LegendContextLayer,
  LegendLayer,
} from "@/app/components/legend/types";
import {
  buildParams,
  renderLegendSymbology,
} from "@/app/components/legend/useLegendHook";
import {
  CONTEXT_LAYER_METADATA,
  DATASET_CARDS,
} from "@/app/constants/datasets";
import { buildYearParam } from "@/app/utils/formatYearRange";
import type { MapWidgetLayer } from "../lib/mapWidgets";

/** Per-sub-layer legend opacity, 0–100 (main dataset · context sub-layer). */
export interface MapWidgetOpacity {
  main: number;
  context: number;
}

/**
 * The explorer's Legend reused inside a dashboard map widget, built from the
 * widget's config snapshot instead of mapStore layers. Dataset entries come
 * from the DATASET_CARDS catalog; imagery entries from the mosaic metadata
 * snapshotted into the config (shared imageryLegend builders). No AOI chips
 * (the dashboard's area is fixed, not removable), and the layer itself isn't
 * removable either (the card's ✕ removes the whole widget), so only opacity
 * is actionable.
 */
export default function DashboardMapLegend({
  layer,
  opacity,
  onOpacityChange,
}: {
  layer: MapWidgetLayer;
  opacity: MapWidgetOpacity;
  onOpacityChange: (target: keyof MapWidgetOpacity, value: number) => void;
}) {
  const entry =
    layer.kind === "imagery"
      ? imageryEntry(layer, opacity.main)
      : datasetEntry(layer, opacity);
  if (!entry) return null;

  return (
    <Legend
      layers={[entry]}
      compact
      onLayerAction={({ action, payload }) => {
        if (action === "opacity") {
          onOpacityChange(
            payload.id === "context" ? "context" : "main",
            payload.opacity
          );
        }
      }}
    />
  );
}

function datasetEntry(
  layer: MapWidgetLayer,
  opacity: MapWidgetOpacity
): LegendLayer | null {
  const card =
    layer.datasetId != null
      ? DATASET_CARDS.find((d) => d.dataset_id === layer.datasetId)
      : undefined;
  if (!card?.legend) return null;
  const legend = card.legend;

  // Same fallback the explorer applies (getDatasetLayerContextProps): configs
  // without explicit parameters rendered with the card's default threshold.
  const parameters =
    layer.parameters ??
    (typeof card.threshold === "number"
      ? { canopy_cover: card.threshold }
      : {});
  const params = buildParams(
    parameters,
    buildYearParam(layer.startDate, layer.endDate)
  );

  let contextLayer: LegendContextLayer | undefined;
  if (layer.contextTileUrl && layer.contextLayerName) {
    const ctxLegend = CONTEXT_LAYER_METADATA[layer.contextLayerName]?.legend;
    contextLayer = {
      id: "context",
      title: ctxLegend?.title ?? layer.contextLayerName,
      color: ctxLegend?.items?.[0]?.color ?? ctxLegend?.color ?? "#888",
      opacity: opacity.context,
      info: ctxLegend?.info,
    };
  }

  return {
    id: "main",
    title: legend.title,
    opacity: opacity.main,
    info: legend.info,
    params: params.length > 0 ? params : undefined,
    contextLayer,
    symbology: renderLegendSymbology(legend),
    children: legend.note ? (
      <Text fontSize="xs">{legend.note}</Text>
    ) : undefined,
    hideRemoveControl: true,
  };
}

function imageryEntry(layer: MapWidgetLayer, opacity: number): LegendLayer {
  const meta = layer.imagery ?? {};
  const params = imageryLegendParams(meta);
  const note = imageryLegendCloudNote(meta);

  return {
    id: "main",
    title: imageryLayerTitle(meta.target_date),
    opacity,
    info: imageryLegendInfo(meta),
    params: params.length > 0 ? params : undefined,
    symbology: null,
    children: note ? <Text fontSize="xs">{note}</Text> : undefined,
    hideRemoveControl: true,
  };
}
