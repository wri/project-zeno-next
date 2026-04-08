import { useCallback, useEffect, useState } from "react";
import { Text } from "@chakra-ui/react";

import { LayerActionHandler, LegendLayer } from "@/app/components/legend/types";
import { LegendSequential } from "@/app/components/legend/LegendSequential";
import { LegendSymbolList } from "@/app/components/legend/LegendSymbolList";
import { LegendCategorical } from "@/app/components/legend/LegendCategorical";
import { LegendDivergent } from "@/app/components/legend/LegendDivergent";
import useMapStore from "@/app/store/mapStore";
import { DATASET_CARDS } from "@/app/constants/datasets";
import useContextStore from "@/app/store/contextStore";


export function useLegendHook() {
  const [layers, setLayers] = useState<LegendLayer[]>([]);

  const { layers: managedLayers, setLayerVisibility, setLayerOpacity, removeLayer, reorderLayers } = useMapStore();
  const { context, removeContext } = useContextStore();

  useEffect(() => {
    const legendLayers: LegendLayer[] = managedLayers.flatMap(layer => {
      if (layer.type === "geojson") {
        return {
          id: layer.id,
          title: layer.selectionName ?? layer.name,
          visible: layer.visible,
          opacity: (layer.opacity ?? 1) * 100,
          hideOpacityControl: true,
          hideRemoveControl: true,
          symbology: null
        };
      }
      const relatedDataset = DATASET_CARDS.find(
        (d) => `dataset-${d.dataset_id}` === layer.id
      );
      if (!relatedDataset?.legend) return [];

      const { type, title, info, note, items, color, unit } =
        relatedDataset.legend;

      return {
        id: layer.id,
        title: title,
        visible: layer.visible,
        opacity: (layer.opacity ?? 1) * 80,
        info,
        symbology:
          type === "categorical" && items ? (
            <LegendCategorical items={items.map(i => ({ value: i.label ?? "", color: i.color }))} />
          ) : type === "sequential" ? (
            <LegendSequential
              minLabel={items?.[0]?.label ?? ""}
              maxLabel={items?.[items.length - 1]?.label ?? ""}
              color={items?.map(item => item.color) ?? (Array.isArray(color) ? color : [color])}
            />
          ) : type === "divergent" ? (
            <LegendDivergent
              unit={relatedDataset.legend.unit ?? ""}
              minLabel={items?.[0]?.label ?? ""}
              maxLabel={items?.[items.length - 1]?.label ?? ""}
              color={items?.map((item) => item.color) ?? (Array.isArray(color) ? color : [color])}
            />
          ) : items ? (
            <LegendSymbolList 
              unit={unit ?? ""}
              items={items.map(i => ({label: i.label ?? "", color: i.color}))} 
            />
          ) : null,
        children: note ? <Text fontSize="xs">{note}</Text> : undefined,
      };
    });

    setLayers(legendLayers);
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
