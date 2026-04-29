import { useCallback, useEffect, useState } from "react";
import { Text } from "@chakra-ui/react";

import { LayerActionHandler, LegendLayer } from "@/app/components/legend/types";
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


const PARAMETER_LABELS: Record<string, string> = {
  canopy_cover: "Canopy ≥",
};

const PARAMETER_UNITS: Record<string, string> = {
  canopy_cover: "%",
};

function formatParameters(params: Record<string, unknown>): string | undefined {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => {
      const label = PARAMETER_LABELS[k] ?? k;
      const unit = PARAMETER_UNITS[k] ?? "";
      return `${label} ${v}${unit}`;
    });
  return parts.length > 0 ? parts.join(" · ") : undefined;
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

export function useLegendHook() {
  const [layers, setLayers] = useState<LegendLayer[]>([]);

  const { layers: managedLayers, setLayerVisibility, setLayerOpacity, removeLayer, reorderLayers } = useMapStore();
  const { context, removeContext } = useContextStore();

  useEffect(() => {
    const buildEntries = (): LegendLayer[] => {
      const entries: LegendLayer[] = [];
      for (const layer of managedLayers) {
        if (layer.type === "geojson" || layer.type === "vector") {
          entries.push({
            id: layer.id,
            title: layer.selectionName ?? layer.name,
            visible: layer.visible,
            opacity: (layer.opacity ?? 1) * 100,
            hideOpacityControl: true,
            hideRemoveControl: true,
            symbology: null,
          });
          continue;
        }

        // Sub-layer (e.g. primary_forest under TCL): rendered as a child row,
        // no remove control (lifecycle owned by the parent dataset's context chip).
        if (layer.parentLayerId) {
          const metadata = CONTEXT_LAYER_METADATA[layer.name];
          const legend = metadata?.legend;
          entries.push({
            id: layer.id,
            title: legend?.title ?? layer.name,
            visible: layer.visible,
            opacity: (layer.opacity ?? 1) * 100,
            info: legend?.info,
            hideRemoveControl: true,
            symbology: legend ? renderLegendSymbology(legend) : null,
            children: legend?.note ? (
              <Text fontSize="xs">{legend.note}</Text>
            ) : undefined,
          });
          continue;
        }

        const relatedDataset = DATASET_CARDS.find(
          (d) => `dataset-${d.dataset_id}` === layer.id
        );
        if (!relatedDataset?.legend) continue;

        const { title, info, note } = relatedDataset.legend;

        const dateRange = layer.startDate && layer.endDate
          ? `${layer.startDate.slice(0, 4)}–${layer.endDate.slice(0, 4)}`
          : undefined;
        const parametersText = layer.parameters
          ? formatParameters(layer.parameters)
          : undefined;

        entries.push({
          id: layer.id,
          title: title,
          visible: layer.visible,
          opacity: (layer.opacity ?? 1) * 80,
          info,
          dateRange,
          parametersText,
          symbology: renderLegendSymbology(relatedDataset.legend),
          children: note ? <Text fontSize="xs">{note}</Text> : undefined,
        });
      }

      // Place each sub-layer directly after its parent so the legend reads top-down.
      const byId = new Map(entries.map((e) => [e.id, e]));
      const subsByParent = new Map<string, LegendLayer[]>();
      const rootEntries: LegendLayer[] = [];
      for (const layer of managedLayers) {
        const e = byId.get(layer.id);
        if (!e) continue;
        if (layer.parentLayerId) {
          if (!subsByParent.has(layer.parentLayerId)) {
            subsByParent.set(layer.parentLayerId, []);
          }
          subsByParent.get(layer.parentLayerId)!.push(e);
        } else {
          rootEntries.push(e);
        }
      }
      const ordered: LegendLayer[] = [];
      for (const root of rootEntries) {
        ordered.push(root);
        const subs = subsByParent.get(root.id);
        if (subs) ordered.push(...subs);
      }
      // Append any orphaned sub-layers (parent missing) at the end.
      for (const [parentId, subs] of subsByParent) {
        if (!rootEntries.some((r) => r.id === parentId)) ordered.push(...subs);
      }
      return ordered;
    };

    setLayers(buildEntries());
  }, [managedLayers]);

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
        case "visibility":
          // Go through the tile layers and update their visibility
          setLayerVisibility(payload.id, payload.visible);
          break;
        case "opacity":
          setLayerOpacity(payload.id, payload.opacity / 100);
          break;
      }
    },
    [context, removeContext, removeLayer, setLayerVisibility, setLayerOpacity, reorderLayers]
  );

  return { layers, handleLayerAction };
}
