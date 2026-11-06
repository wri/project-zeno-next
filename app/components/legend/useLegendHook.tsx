import { useCallback, useEffect, useState } from "react";
import { Box, Text } from "@chakra-ui/react";

import {
  isImageryGroup,
  LayerActionHandler,
  LegendContextLayer,
  LegendEntry,
  LegendLayer,
} from "@/app/components/legend/types";
import { LegendSequential } from "@/app/components/legend/LegendSequential";
import { LegendSymbolList } from "@/app/components/legend/LegendSymbolList";
import { LegendCategorical } from "@/app/components/legend/LegendCategorical";
import { LegendDivergent } from "@/app/components/legend/LegendDivergent";
import useMapStore from "@/app/store/mapStore";
import useChatStore from "@/app/store/chatStore";
import {
  CONTEXT_LAYER_METADATA,
  DATASET_CARDS,
} from "@/app/constants/datasets";
import type { DatasetLegendConfig } from "@/app/constants/datasets";
import {
  CONCESSION_STYLES,
  type ConcessionStyle,
  selectLayerOptions,
} from "@/app/types/map";
import { Tooltip } from "@/app/components/ui/tooltip";
import { isAreaLayer } from "@/app/store/layerManagerSlice";
import {
  buildImageryGroup,
  IMAGERY_LEGEND_GROUP_ID,
} from "@/app/utils/imagery";
import { useDatasetsCatalog } from "@/app/hooks/useDatasetsCatalog";
import {
  buildParams,
  contextLegendFor,
  legendSymbology,
} from "@/app/components/legend/legendModel";
import { applyPaletteOverride } from "@/app/components/legend/applyPaletteOverride";

function renderLegendSymbology(legend: DatasetLegendConfig) {
  const s = legendSymbology(legend);

  switch (s.kind) {
    case "categorical":
      return (
        <LegendCategorical
          items={s.classes.map((c) => ({ value: c.label, color: c.color }))}
        />
      );
    case "symbol":
      return <LegendSymbolList unit={s.unit} items={s.classes} />;
    case "sequential":
      return (
        <LegendSequential
          unit={s.unit}
          minLabel={s.minLabel}
          maxLabel={s.maxLabel}
          color={s.colors}
        />
      );
    case "divergent":
      return (
        <LegendDivergent
          unit={s.unit}
          minLabel={s.minLabel}
          maxLabel={s.maxLabel}
          color={s.colors}
        />
      );
  }
}

/**
 * Id of the legend entry for a concession boundary layer. It is no map-manager
 * layer: its actions act on `selectAreaLayer` and `boundaryOpacity`.
 */
export const BOUNDARY_LEGEND_ID = "boundary-layer";

/**
 * A concession boundary layer as a legend layer, as on the GNW concessions
 * map: a swatch row, and a note naming the countries the source covers.
 */
export function concessionLegendEntry(
  style: ConcessionStyle,
  opacity: number
): LegendLayer {
  return {
    id: BOUNDARY_LEGEND_ID,
    title: style.title,
    opacity: opacity * 100,
    info: style.info,
    // Drawn like a dataset layer's symbol legend (Grasslands), so the entry
    // matches the other layers in the legend.
    symbology: (
      <LegendSymbolList
        items={[{ label: style.title, color: style.fillColor }]}
      />
    ),
    children: (
      <Text fontSize="xs">
        This layer is only available{" "}
        <Tooltip
          content={style.countries.join(", ")}
          positioning={{ placement: "top" }}
          showArrow
        >
          {/* The dotted underline of the GNW map's country note. */}
          <Box
            as="u"
            tabIndex={0}
            cursor="help"
            textDecorationLine="underline"
            textDecorationStyle="dotted"
            textDecorationColor="#b2b6bd"
            textDecorationThickness="0.125em"
            css={{ textDecorationSkipInk: "none" }}
          >
            for certain countries
          </Box>
        </Tooltip>
        .
      </Text>
    ),
  };
}

export interface LegendAoi {
  /** Id of the map layer this AOI belongs to — used to remove it. */
  layerId: string;
  name: string;
}

/** The visible boundary layer, shown as an AREA pill named after the dataset. */
export interface LegendBoundary {
  name: string;
}

export function useLegendHook() {
  const [layers, setLayers] = useState<LegendEntry[]>([]);
  const { palettesByDatasetId } = useDatasetsCatalog();

  const {
    layers: managedLayers,
    setLayerOpacity,
    setLayerVisibility,
    removeLayer,
    reorderLayers,
    selectAreaLayer,
    setSelectAreaLayer,
    boundaryOpacity,
    setBoundaryOpacity,
  } = useMapStore();
  const concessionStyle = selectAreaLayer
    ? CONCESSION_STYLES[selectAreaLayer]
    : undefined;
  const isImageryUpdating = useChatStore((s) => s.isImageryUpdating);

  useEffect(() => {
    const buildEntries = (): LegendEntry[] => {
      // First pass: build a map of parentLayerId → contextLayer data so we can
      // attach sub-layers to their parent entries in the second pass.
      const contextLayerByParentId = new Map<string, LegendContextLayer>();
      for (const layer of managedLayers) {
        if (!layer.parentLayerId) continue;
        const legend = CONTEXT_LAYER_METADATA[layer.name]?.legend;
        contextLayerByParentId.set(layer.parentLayerId, {
          id: layer.id,
          ...contextLegendFor(layer.name),
          opacity: (layer.opacity ?? 1) * 100,
          // The swatch beside the title already stands for a single-class
          // layer. Multi-class ones (IFL's reduction epochs) need the full
          // symbol list, or every class but the first goes unexplained.
          symbology:
            legend && (legend.items?.length ?? 0) > 1
              ? renderLegendSymbology(legend)
              : undefined,
        });
      }

      // Second pass: build root-level legend entries.
      // AOI layers are surfaced as chips separately — skip them.
      // Sub-layers are embedded in their parent via contextLayer — skip them too.
      // Imagery layers collapse into one group entry, placed where the first
      // (newest) capture sits in the layer order.
      const imageryGroup = buildImageryGroup(
        managedLayers.filter((l) => !!l.imagery),
        isImageryUpdating
      );
      let imageryGroupPushed = false;

      // A concession boundary layer is a legend layer, not an AREA pill.
      const entries: LegendEntry[] = concessionStyle
        ? [concessionLegendEntry(concessionStyle, boundaryOpacity)]
        : [];
      for (const layer of managedLayers) {
        if (layer.parentLayerId) continue;
        if (isAreaLayer(layer)) continue;
        if (layer.imagery) {
          if (imageryGroup && !imageryGroupPushed) {
            entries.push(imageryGroup);
            imageryGroupPushed = true;
          }
          continue;
        }

        const relatedDataset = DATASET_CARDS.find(
          (d) => d.dataset_id === layer.datasetId
        );
        if (!relatedDataset) continue;

        // Multi-layer datasets (e.g. LGMS) carry a legend per sibling layer;
        // single-layer datasets fall back to the card's top-level legend.
        const sublayerLegend = relatedDataset.layers?.find(
          (l) => l.name === layer.name
        )?.legend;
        const baseLegend = sublayerLegend ?? relatedDataset.legend;
        if (!baseLegend) continue;

        const legend = applyPaletteOverride(
          baseLegend,
          palettesByDatasetId[relatedDataset.dataset_id]
        );
        const { title, info, note } = legend;

        const params = buildParams(relatedDataset, layer);

        entries.push({
          id: layer.id,
          title,
          opacity: (layer.opacity ?? 1) * 80,
          info,
          params: params.length > 0 ? params : undefined,
          contextLayer: contextLayerByParentId.get(layer.id),
          symbology: renderLegendSymbology(legend),
          children: note ? <Text fontSize="xs">{note}</Text> : undefined,
        });
      }

      // First-run updating state: show_imagery announced but no capture has
      // landed yet, so no imagery layer marked the group's position above.
      if (imageryGroup && !imageryGroupPushed) {
        entries.push(imageryGroup);
      }

      return entries;
    };

    setLayers(buildEntries());
  }, [
    managedLayers,
    isImageryUpdating,
    palettesByDatasetId,
    concessionStyle,
    boundaryOpacity,
  ]);

  // One chip per visible area layer, using the selection name as the label.
  // The visible layer IS the scope — removing the chip removes the layer.
  const aois: LegendAoi[] = managedLayers.filter(isAreaLayer).map((l) => ({
    layerId: l.id,
    name: l.selectionName ?? l.name,
  }));

  // The concession layers are legend layers (above), so they get no pill.
  const boundaryName = concessionStyle
    ? undefined
    : selectLayerOptions.find((o) => o.id === selectAreaLayer)?.name;
  const boundary: LegendBoundary | null = boundaryName
    ? { name: boundaryName }
    : null;

  // Closing the boundary pill turns the layer off (and its Boundaries card).
  const handleRemoveBoundary = useCallback(
    () => setSelectAreaLayer(null),
    [setSelectAreaLayer]
  );

  const handleRemoveAoi = useCallback(
    (layerId: string) => removeLayer(layerId),
    [removeLayer]
  );

  const handleLayerAction = useCallback<LayerActionHandler>(
    ({ action, payload }) => {
      if (action === "reorder") {
        // Expand legend entries to map-layer ids: the imagery group stands
        // for all its capture layers, and each dataset root drags its context
        // sub-layers along. Layers with no legend entry (AOI layers) keep
        // their position at the end — reorderLayers drops any id not listed.
        const orderedIds = payload.layers.flatMap((entry) => {
          // The boundary layer is no map-manager layer.
          if (entry.id === BOUNDARY_LEGEND_ID) return [];
          if (isImageryGroup(entry)) {
            return entry.captures.map((c) => c.layerId);
          }
          const childIds = managedLayers
            .filter((l) => l.parentLayerId === entry.id)
            .map((l) => l.id);
          return [entry.id, ...childIds];
        });
        const rest = managedLayers
          .map((l) => l.id)
          .filter((id) => !orderedIds.includes(id));
        reorderLayers([...orderedIds, ...rest]);
        return;
      }

      // The boundary entry's controls act on the boundary layer: removing
      // it turns the layer off (and its Boundaries card).
      if (payload.id === BOUNDARY_LEGEND_ID) {
        if (action === "remove") setSelectAreaLayer(null);
        if (action === "opacity") setBoundaryOpacity(payload.opacity / 100);
        return;
      }

      // The imagery group's header controls act on every capture layer.
      const isImageryGroupId = payload.id === IMAGERY_LEGEND_GROUP_ID;
      const imageryLayers = isImageryGroupId
        ? managedLayers.filter((l) => !!l.imagery)
        : [];

      switch (action) {
        case "remove":
          if (isImageryGroupId) {
            imageryLayers.forEach((l) => removeLayer(l.id));
            break;
          }
          // The visible layer IS the scope — removing it is the only mutation.
          // Also drop any context sub-layers parented to this dataset layer.
          managedLayers
            .filter((l) => l.parentLayerId === payload.id)
            .forEach((l) => removeLayer(l.id));
          removeLayer(payload.id);
          break;
        case "opacity":
          if (isImageryGroupId) {
            imageryLayers.forEach((l) =>
              setLayerOpacity(l.id, payload.opacity / 100)
            );
            break;
          }
          setLayerOpacity(payload.id, payload.opacity / 100);
          break;
        case "visibility":
          setLayerVisibility(payload.id, payload.visible);
          break;
      }
    },
    [
      managedLayers,
      removeLayer,
      setLayerOpacity,
      setLayerVisibility,
      reorderLayers,
      setSelectAreaLayer,
      setBoundaryOpacity,
    ]
  );

  return {
    layers,
    handleLayerAction,
    aois,
    handleRemoveAoi,
    boundary,
    handleRemoveBoundary,
  };
}
