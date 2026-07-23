"use client";

import { Text } from "@chakra-ui/react";

import { Legend } from "@/app/components/legend/Legend";
import type {
  ImageryLegendGroup,
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
import {
  IMAGERY_LAYER_NAME,
  IMAGERY_LEGEND_GROUP_ID,
  IMAGERY_SUBTITLE,
  imageryCloudNote,
  imageryLegendInfo,
  imageryLegendParams,
  imageryThumbnailUrl,
} from "@/app/utils/imagery";
import type { MapWidgetLayer } from "../lib/mapWidgets";

/** Per-sub-layer legend opacity, 0–100 (main dataset · context sub-layer). */
export interface MapWidgetOpacity {
  main: number;
  context: number;
}

/**
 * The explorer's Legend reused inside a dashboard map widget, built from the
 * widget's config snapshot instead of mapStore layers. No AOI chips (the
 * dashboard's area is fixed, not removable), and the layer itself isn't
 * removable either (the card's ✕ removes the whole widget), so only opacity
 * is actionable. Imagery widgets render the imagery legend group without a
 * captures list — a widget is a single static snapshot.
 */
export default function DashboardMapLegend({
  layer,
  opacity,
  onOpacityChange,
  thumbnailBounds,
}: {
  layer: MapWidgetLayer;
  opacity: MapWidgetOpacity;
  onOpacityChange: (target: keyof MapWidgetOpacity, value: number) => void;
  /** The widget's viewport bbox — used for the imagery preview tile. */
  thumbnailBounds?: [number, number, number, number] | null;
}) {
  if (layer.kind === "imagery" && layer.imagery) {
    const entry: ImageryLegendGroup = {
      kind: "imagery",
      id: IMAGERY_LEGEND_GROUP_ID,
      title: IMAGERY_LAYER_NAME,
      subtitle: IMAGERY_SUBTITLE,
      opacity: opacity.main,
      params: imageryLegendParams(layer.imagery),
      info: imageryLegendInfo(layer.imagery),
      note: imageryCloudNote(layer.imagery),
      captures: [],
      areaCount: 0,
      updating: false,
      thumbnailUrl: thumbnailBounds
        ? imageryThumbnailUrl(
            layer.tileUrl,
            thumbnailBounds,
            layer.minzoom,
            layer.maxzoom
          )
        : undefined,
      hideRemoveControl: true,
    };
    return (
      <Legend
        layers={[entry]}
        compact
        onLayerAction={({ action, payload }) => {
          if (action === "opacity") onOpacityChange("main", payload.opacity);
        }}
      />
    );
  }

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

  const entry: LegendLayer = {
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
