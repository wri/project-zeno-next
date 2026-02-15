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

/**
 * Derive a human-readable dateRange string from active params.
 * Returns undefined when the dataset has no year params.
 */
function deriveDateRange(
  params: Record<string, number | string> | undefined,
  paramSpecs: Record<string, import("@/app/constants/datasets").ParamSpec> | undefined
): string | undefined {
  if (!params || !paramSpecs) return undefined;

  // Year range (start/end year)
  const startSpec = Object.entries(paramSpecs).find(([, s]) => s.type === "year" && s.url_key.includes("start"));
  const endSpec = Object.entries(paramSpecs).find(([, s]) => s.type === "year" && s.url_key.includes("end"));

  if (startSpec && endSpec) {
    const start = params[startSpec[0]] ?? startSpec[1].default;
    const end = params[endSpec[0]] ?? endSpec[1].default;
    return `(${start}–${end})`;
  }

  // Date range (start/end date)
  const startDateSpec = Object.entries(paramSpecs).find(([, s]) => s.type === "date" && s.url_key.includes("start"));
  const endDateSpec = Object.entries(paramSpecs).find(([, s]) => s.type === "date" && s.url_key.includes("end"));

  if (startDateSpec && endDateSpec) {
    const start = params[startDateSpec[0]] ?? startDateSpec[1].default;
    const end = params[endDateSpec[0]] ?? endDateSpec[1].default;
    return `(${start}–${end})`;
  }

  // Single year param
  const yearSpec = Object.entries(paramSpecs).find(([, s]) => s.type === "year");
  if (yearSpec) {
    const year = params[yearSpec[0]] ?? yearSpec[1].default;
    return `(${year})`;
  }

  return undefined;
}

export function useLegendHook() {
  const [layers, setLayers] = useState<LegendLayer[]>([]);

  const { tileLayers, setTileLayers, updateTileLayerParams } = useMapStore();
  const { context, removeContext, updateContextParams, upsertContextByType } = useContextStore();

  useEffect(() => {
    const activeLayers = tileLayers.flatMap((tileLayer) => {
      const relatedDataset = DATASET_CARDS.find(
        (d) => `dataset-${d.dataset_id}` === tileLayer.id
      );
      if (!relatedDataset?.legend) return [];

      const { type, title, info, note, items, color, unit } =
        relatedDataset.legend;

      const cfgParams = relatedDataset.configurable_params;
      const hasConfigurableParams = !!cfgParams && Object.keys(cfgParams).length > 0;

      // Build effective params: defaults merged with overrides from tileLayer
      const effectiveParams: Record<string, number | string> = {};
      if (cfgParams) {
        for (const [key, spec] of Object.entries(cfgParams)) {
          effectiveParams[key] = tileLayer.params?.[key] ?? spec.default;
        }
      }

      return {
        id: tileLayer.id,
        title: title,
        visible: tileLayer.visible,
        opacity: (tileLayer.opacity ?? 1) * 80,
        info,
        dateRange: deriveDateRange(effectiveParams, cfgParams),
        configurable: hasConfigurableParams,
        params: hasConfigurableParams ? effectiveParams : undefined,
        paramSpecs: hasConfigurableParams ? cfgParams : undefined,
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
        case "remove": {
          const ctx = context.find(
            (c) =>
              c.contextType === "layer" &&
              `dataset-${c.datasetId}` === payload.id
          );
          if (ctx) {
            removeContext(ctx.id);
          }

          // Clean up derived context chips (threshold, confidence, date) if no
          // other active layer still provides them.
          const removedCard = DATASET_CARDS.find(
            (d) => `dataset-${d.dataset_id}` === payload.id
          );
          const remainingLayers = tileLayers.filter((l) => l.id !== payload.id);

          if (removedCard?.configurable_params) {
            const removedSpecs = removedCard.configurable_params;
            const hasThreshold = Object.values(removedSpecs).some(
              (s) => s.type === "categorical" && s.url_key.includes("threshold")
            );
            const hasConfidence = Object.values(removedSpecs).some(
              (s) => s.type === "categorical" && s.url_key.includes("confidence")
            );
            const hasDateRange =
              Object.values(removedSpecs).some(
                (s) => s.type === "year" && s.url_key.includes("start")
              ) ||
              Object.values(removedSpecs).some(
                (s) => s.type === "date" && s.url_key.includes("start")
              );

            // Check if any remaining layer still provides each chip type
            const remainingCards = remainingLayers
              .map((l) => DATASET_CARDS.find((d) => `dataset-${d.dataset_id}` === l.id))
              .filter((c): c is NonNullable<typeof c> => !!c && !!c.configurable_params);

            if (hasThreshold) {
              const otherHasThreshold = remainingCards.some((c) =>
                Object.values(c.configurable_params!).some(
                  (s) => s.type === "categorical" && s.url_key.includes("threshold")
                )
              );
              if (!otherHasThreshold) {
                const chip = context.find((c) => c.contextType === "threshold");
                if (chip) removeContext(chip.id);
              }
            }

            if (hasConfidence) {
              const otherHasConfidence = remainingCards.some((c) =>
                Object.values(c.configurable_params!).some(
                  (s) => s.type === "categorical" && s.url_key.includes("confidence")
                )
              );
              if (!otherHasConfidence) {
                const chip = context.find((c) => c.contextType === "confidence");
                if (chip) removeContext(chip.id);
              }
            }

            if (hasDateRange) {
              const otherHasDateRange = remainingCards.some((c) =>
                Object.values(c.configurable_params!).some(
                  (s) =>
                    (s.type === "year" || s.type === "date") &&
                    s.url_key.includes("start")
                )
              );
              if (!otherHasDateRange) {
                const chip = context.find((c) => c.contextType === "date");
                if (chip) removeContext(chip.id);
              }
            }
          }
          break;
        }
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
        case "params": {
          updateTileLayerParams(payload.id, payload.params);
          // Also sync to context store so chat ui_context stays current
          const datasetIdStr = payload.id.replace("dataset-", "");
          const parsedId = parseInt(datasetIdStr, 10);
          if (!isNaN(parsedId)) {
            updateContextParams(parsedId, payload.params);
          }

          // Sync derived context chips (threshold, confidence, date range)
          const dsCard = DATASET_CARDS.find(
            (d) => `dataset-${d.dataset_id}` === payload.id
          );
          if (dsCard?.configurable_params) {
            const specs = dsCard.configurable_params;

            // Threshold chip — threshold params are now categorical with url_key containing "threshold"
            const thresholdEntry = Object.entries(specs).find(
              ([, s]) => s.type === "categorical" && s.url_key.includes("threshold")
            );
            if (thresholdEntry) {
              const val = payload.params[thresholdEntry[0]] ?? thresholdEntry[1].default;
              upsertContextByType({
                contextType: "threshold",
                content: `Tree cover ≥ ${val}%`,
              });
            }

            // Confidence chip — categorical params with "confidence" in url_key
            const confEntry = Object.entries(specs).find(
              ([, s]) => s.type === "categorical" && s.url_key.includes("confidence")
            );
            if (confEntry) {
              const val = (payload.params[confEntry[0]] ?? confEntry[1].default) as string;
              const opt = confEntry[1].options?.find((o) => o.value === val);
              upsertContextByType({
                contextType: "confidence",
                content: `Confidence: ${opt?.label ?? val}`,
              });
            }

            // Date range chip — sync year range or date range params to date context
            const startYearSpec = Object.entries(specs).find(
              ([, s]) => s.type === "year" && s.url_key.includes("start")
            );
            const endYearSpec = Object.entries(specs).find(
              ([, s]) => s.type === "year" && s.url_key.includes("end")
            );
            const startDateSpec = Object.entries(specs).find(
              ([, s]) => s.type === "date" && s.url_key.includes("start")
            );
            const endDateSpec = Object.entries(specs).find(
              ([, s]) => s.type === "date" && s.url_key.includes("end")
            );

            if (startYearSpec && endYearSpec) {
              const startVal = payload.params[startYearSpec[0]] ?? startYearSpec[1].default;
              const endVal = payload.params[endYearSpec[0]] ?? endYearSpec[1].default;
              upsertContextByType({
                contextType: "date",
                content: `${startVal} – ${endVal}`,
                dateRange: {
                  start: new Date(`${startVal}-01-01`),
                  end: new Date(`${endVal}-12-31`),
                },
              });
            } else if (startDateSpec && endDateSpec) {
              const startVal = (payload.params[startDateSpec[0]] ?? startDateSpec[1].default) as string;
              const endVal = (payload.params[endDateSpec[0]] ?? endDateSpec[1].default) as string;
              upsertContextByType({
                contextType: "date",
                content: `${startVal} – ${endVal}`,
                dateRange: {
                  start: new Date(startVal),
                  end: new Date(endVal),
                },
              });
            }
          }
          break;
        }
      }
    },
    [context, removeContext, tileLayers, setTileLayers, updateTileLayerParams, updateContextParams, upsertContextByType]
  );

  return { layers, handleLayerAction };
}
