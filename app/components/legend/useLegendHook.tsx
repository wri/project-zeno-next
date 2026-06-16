import { useCallback, useEffect, useState } from "react";
import { Text } from "@chakra-ui/react";
import { format, parseISO } from "date-fns";

import {
  LayerActionHandler,
  LegendContextLayer,
  LegendLayer,
  LegendParam,
} from "@/app/components/legend/types";
import { LegendSequential } from "@/app/components/legend/LegendSequential";
import { LegendSymbolList } from "@/app/components/legend/LegendSymbolList";
import { LegendCategorical } from "@/app/components/legend/LegendCategorical";
import { LegendDivergent } from "@/app/components/legend/LegendDivergent";
import useMapStore from "@/app/store/mapStore";
import {
  CONTEXT_LAYER_METADATA,
  DATASET_CARDS,
} from "@/app/constants/datasets";
import { buildYearParam, YearParam } from "@/app/utils/formatYearRange";
import { formatCanopyThreshold } from "@/app/utils/formatCanopyThreshold";
import type { DatasetLegendConfig } from "@/app/constants/datasets";
import useContextStore from "@/app/store/contextStore";

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
 * Converts a layer's raw parameters object into structured LegendParam chips.
 * Each entry becomes a { label, value } pair rendered as a badge in the card.
 */
function buildParams(
  params: Record<string, unknown>,
  yearParam?: YearParam
): LegendParam[] {
  const result: LegendParam[] = [];

  if (yearParam) {
    result.push(yearParam);
  }

  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    const label = PARAMETER_LABELS[k] ?? k.toUpperCase();
    const format = PARAMETER_FORMATTERS[k];
    result.push({ label, value: format ? format(v) : String(v) });
  }

  return result;
}

// Backend default for show_imagery's max_cloud_cover; anything above it
// means the agent loosened the search and clouds are expected.
const IMAGERY_DEFAULT_MAX_CLOUD_COVER = 20;

function formatImageryDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "MMM d, yyyy");
  } catch {
    return isoDate;
  }
}

function renderLegendSymbology(legend: DatasetLegendConfig) {
  const { type, items, color, unit } = legend;

  return type === "categorical" && items ? (
    <LegendCategorical
      items={items.map((i) => ({ value: i.label ?? "", color: i.color }))}
    />
  ) : type === "sequential" ? (
    <LegendSequential
      minLabel={items?.[0]?.label ?? ""}
      maxLabel={items?.[items.length - 1]?.label ?? ""}
      color={
        items?.map((item) => item.color) ??
        (Array.isArray(color) ? color : [color])
      }
    />
  ) : type === "divergent" ? (
    <LegendDivergent
      unit={unit ?? ""}
      minLabel={items?.[0]?.label ?? ""}
      maxLabel={items?.[items.length - 1]?.label ?? ""}
      color={
        items?.map((item) => item.color) ??
        (Array.isArray(color) ? color : [color])
      }
    />
  ) : items ? (
    <LegendSymbolList
      unit={unit ?? ""}
      items={items.map((i) => ({ label: i.label ?? "", color: i.color }))}
    />
  ) : null;
}

export interface LegendAoi {
  /** Unique id of the context item this AOI belongs to — used to remove it. */
  contextId: string;
  name: string;
}

export function useLegendHook() {
  const [layers, setLayers] = useState<LegendLayer[]>([]);

  const {
    layers: managedLayers,
    setLayerOpacity,
    removeLayer,
    reorderLayers,
  } = useMapStore();
  const { context, removeContext } = useContextStore();

  useEffect(() => {
    const buildEntries = (): LegendLayer[] => {
      // Context is the single source of truth for "is this layer an AOI?".
      // We build two sets to cover both cases:
      //   - aoiLayerNames: matches assistant-picked AOI layers (layer.id === selection name)
      //   - aoiLayerIds:   matches custom-area layers (layer.id === aoiData.src_id, a DB id)
      const areaItems = context.filter((c) => c.contextType === "area");
      const aoiLayerNames = new Set(
        areaItems.map(
          (c) => c.aoiSelection?.name ?? c.aoiData?.name ?? String(c.content)
        )
      );
      const aoiLayerIds = new Set(
        areaItems.map((c) => c.aoiData?.src_id).filter(Boolean)
      );

      // First pass: build a map of parentLayerId → contextLayer data so we can
      // attach sub-layers to their parent entries in the second pass.
      const contextLayerByParentId = new Map<string, LegendContextLayer>();
      for (const layer of managedLayers) {
        if (!layer.parentLayerId) continue;
        const metadata = CONTEXT_LAYER_METADATA[layer.name];
        const legend = metadata?.legend;
        // Use the first item's colour as the swatch, falling back to the
        // legend's top-level color field.
        const color = legend?.items?.[0]?.color ?? legend?.color ?? "#888";
        contextLayerByParentId.set(layer.parentLayerId, {
          id: layer.id,
          title: legend?.title ?? layer.name,
          color,
          opacity: (layer.opacity ?? 1) * 100,
          info: legend?.info,
        });
      }

      // Second pass: build root-level legend entries.
      // AOI layers are surfaced as chips separately — skip them.
      // Sub-layers are embedded in their parent via contextLayer — skip them too.
      const entries: LegendLayer[] = [];
      for (const layer of managedLayers) {
        if (aoiLayerNames.has(layer.name) || aoiLayerIds.has(layer.id))
          continue;
        if (layer.parentLayerId) continue;

        // Non-dataset vector/geojson layers (e.g. boundary overlays) get a
        // minimal card with no symbology — just title + opacity control.
        if (layer.type === "geojson" || layer.type === "vector") {
          entries.push({
            id: layer.id,
            title: layer.selectionName ?? layer.name,
            opacity: (layer.opacity ?? 1) * 100,
            symbology: null,
          });
          continue;
        }

        // Sentinel-2 mosaics from the show_imagery tool have no DATASET_CARDS
        // entry — build a card from the imagery metadata carried on the layer.
        if (layer.imagery) {
          const { imagery } = layer;
          const params: LegendParam[] = [];
          // Acquired date range is absent on cache hits — omit the chip then.
          if (imagery.date_start && imagery.date_end) {
            params.push({
              label: "DATES",
              value: `${formatImageryDate(imagery.date_start)} – ${formatImageryDate(imagery.date_end)}`,
            });
          }
          // Search constraints: absent on imagery payloads created before
          // these fields existed (replayed old threads) — omit the chips.
          if (imagery.window_days !== undefined) {
            params.push({
              label: "WINDOW",
              value: `±${imagery.window_days} days`,
            });
          }
          if (imagery.max_cloud_cover !== undefined) {
            params.push({
              label: "CLOUD",
              value: `< ${imagery.max_cloud_cover}%`,
            });
          }
          if (imagery.aoi_names.length > 0) {
            params.push({
              label: "AREA",
              value: imagery.aoi_names.join(", "),
            });
          }
          // Above the default 20% threshold the agent loosened the search,
          // so partly obscured imagery is expected — flag it so it doesn't
          // read as a rendering bug.
          const mayContainClouds =
            imagery.max_cloud_cover !== undefined &&
            imagery.max_cloud_cover > IMAGERY_DEFAULT_MAX_CLOUD_COVER;
          entries.push({
            id: layer.id,
            title: layer.name,
            opacity: (layer.opacity ?? 1) * 100,
            info: `Sentinel-2 true-colour mosaic${
              imagery.item_count !== undefined
                ? ` built from ${imagery.item_count} scene${imagery.item_count === 1 ? "" : "s"}`
                : ""
            } closest to ${formatImageryDate(imagery.target_date)}. Contains modified Copernicus Sentinel data.`,
            params,
            symbology: null,
            children: mayContainClouds ? (
              <Text fontSize="xs">
                Searched with a loosened cloud-cover limit (
                {imagery.max_cloud_cover}%) — imagery may contain clouds.
              </Text>
            ) : undefined,
          });
          continue;
        }

        const relatedDataset = DATASET_CARDS.find(
          (d) => `dataset-${d.dataset_id}` === layer.id
        );
        if (!relatedDataset?.legend) continue;

        const { title, info, note } = relatedDataset.legend;

        const yearParam = buildYearParam(layer.startDate, layer.endDate);
        const params = buildParams(layer.parameters ?? {}, yearParam);

        entries.push({
          id: layer.id,
          title,
          opacity: (layer.opacity ?? 1) * 80,
          info,
          params: params.length > 0 ? params : undefined,
          contextLayer: contextLayerByParentId.get(layer.id),
          symbology: renderLegendSymbology(relatedDataset.legend),
          children: note ? <Text fontSize="xs">{note}</Text> : undefined,
        });
      }

      return entries;
    };

    setLayers(buildEntries());
  }, [managedLayers, context]);

  // One chip per selection (context item), using the selection name as the label.
  // Removing a chip removes the whole selection and its map layer.
  const aois: LegendAoi[] = context
    .filter((c) => c.contextType === "area")
    .map((c) => ({
      contextId: c.id,
      name: c.aoiSelection?.name ?? c.aoiData?.name ?? String(c.content),
    }));

  const handleRemoveAoi = useCallback(
    (contextId: string) => removeContext(contextId),
    [removeContext]
  );

  const handleLayerAction = useCallback<LayerActionHandler>(
    ({ action, payload }) => {
      if (action === "reorder") {
        reorderLayers(payload.layers.map((l) => l.id));
        return;
      }

      switch (action) {
        case "remove":
          const ctx = context.find(
            (c) =>
              c.contextType === "layer" &&
              `dataset-${c.datasetId}` === payload.id
          );
          if (ctx) {
            removeContext(ctx.id);
          }
          removeLayer(payload.id);
          break;
        case "opacity":
          setLayerOpacity(payload.id, payload.opacity / 100);
          break;
      }
    },
    [context, removeContext, removeLayer, setLayerOpacity, reorderLayers]
  );

  return { layers, handleLayerAction, aois, handleRemoveAoi };
}
