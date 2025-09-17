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

  const { tileLayers, setTileLayers } = useMapStore();
  const { context, removeContext } = useContextStore();

  useEffect(() => {
    const activeLayers = tileLayers.flatMap((tileLayer) => {
      const relatedDataset = DATASET_CARDS.find(
        (d) => `dataset-${d.dataset_id}` === tileLayer.id
      );
      if (!relatedDataset?.legend) return [];

      const { type, title, info, note, items, color, unit } =
        relatedDataset.legend;

      return {
        id: tileLayer.id,
        title: title,
        visible: tileLayer.visible,
        opacity: (tileLayer.opacity ?? 1) * 80,
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

    setLayers(activeLayers);
  }, [tileLayers]);

  const handleLayerAction = useCallback<LayerActionHandler>(
    ({ action, payload }) => {
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
          break;
        case "visibility":
          // Go through the tile layers and update their visibility
          const updatedLayers = tileLayers.map((layer) =>
            layer.id === payload.id
              ? { ...layer, visible: payload.visible }
              : layer
          );
          setTileLayers(updatedLayers);
          break;
        case "opacity":
          const layersWithUpdatedOpacity = tileLayers.map((layer) =>
            layer.id === payload.id
              ? { ...layer, opacity: payload.opacity / 100 }
              : layer
          );
          setTileLayers(layersWithUpdatedOpacity);
          break;
        case "reorder":
          // Reorder tileLayers to match the new order in payload.layers.
          const reorderedLayers = payload.layers
            .map((l) => tileLayers.find((tl) => tl.id === l.id))
            // Filter out undefined although it shouldn't happen.
            .filter((l): l is NonNullable<typeof l> => !!l);
          setTileLayers(reorderedLayers);
          break;
      }
    },
    [context, removeContext, tileLayers, setTileLayers]
  );

  return { layers, handleLayerAction };
}
