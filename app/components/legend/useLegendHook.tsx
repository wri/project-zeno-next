import { useCallback, useEffect, useState } from "react";
import { Text } from "@chakra-ui/react";

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
import type { DatasetLegendConfig } from "@/app/constants/datasets";
import useContextStore from "@/app/store/contextStore";

// Maps internal parameter keys to the badge label shown in the legend.
const PARAMETER_LABELS: Record<string, string> = {
  canopy_cover: "CANOPY",
};

// Maps internal parameter keys to a formatting function that produces the value string.
const PARAMETER_FORMATTERS: Record<string, (v: unknown) => string> = {
  canopy_cover: (v) => `>= ${v}%`,
};

/**
 * Converts a layer's raw parameters object into structured LegendParam chips.
 * Each entry becomes a { label, value } pair rendered as a badge in the card.
 */
function buildParams(
  params: Record<string, unknown>,
  dateRange?: string
): LegendParam[] {
  const result: LegendParam[] = [];

  if (dateRange) {
    // Use "YEARS" for a range, "YEAR" for a single year.
    const label = dateRange.includes("–") ? "YEARS" : "YEAR";
    result.push({ label, value: dateRange });
  }

  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    const label = PARAMETER_LABELS[k] ?? k.toUpperCase();
    const format = PARAMETER_FORMATTERS[k];
    result.push({ label, value: format ? format(v) : String(v) });
  }

  return result;
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

        const relatedDataset = DATASET_CARDS.find(
          (d) => `dataset-${d.dataset_id}` === layer.id
        );
        if (!relatedDataset?.legend) continue;

        const { title, info, note } = relatedDataset.legend;

        const dateRange = (() => {
          if (!layer.startDate || !layer.endDate) return undefined;
          const startYear = layer.startDate.slice(0, 4);
          const endYear = layer.endDate.slice(0, 4);
          return startYear === endYear
            ? startYear
            : `${startYear}\u2013${endYear}`;
        })();
        const params = buildParams(layer.parameters ?? {}, dateRange);

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
