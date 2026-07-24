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
import { buildYearParam, YearParam } from "@/app/utils/formatYearRange";
import { formatCanopyThreshold } from "@/app/utils/formatCanopyThreshold";
import type { DatasetLegendConfig } from "@/app/constants/datasets";
import { isAreaLayer } from "@/app/store/layerManagerSlice";
import { useDatasetsCatalog } from "@/app/hooks/useDatasetsCatalog";
import type { DatasetPalette } from "@/app/schemas/api/datasets/get";

/**
 * Overrides a dataset's hardcoded legend colors with the backend-owned
 * palette (see docs/insight-chart-colors-plan.md in project-zeno), so the
 * map legend is guaranteed to match the colors used in generated charts.
 * Falls back to the static legend when no backend palette is available yet
 * (e.g. still loading) — this is a progressive enhancement, not a hard
 * dependency. Divergent (raster gradient) legends are left untouched: that
 * continuous colormap isn't the same shape as the registry's simple
 * positive/negative chart color pair. Datasets with `legend_categories:
 * false` (e.g. SBTN Natural Lands, which intentionally collapses its
 * non-natural classes into one legend row) keep their hand-curated static
 * `items` untouched too — only their chart colors come from the registry.
 */
function applyPaletteOverride(
  legend: DatasetLegendConfig,
  palette?: DatasetPalette
): DatasetLegendConfig {
  if (!palette || legend.type === "divergent") return legend;

  if (palette.categories.length > 0 && palette.legend_categories) {
    return {
      ...legend,
      items: palette.categories.map((category) => ({
        label: category.label_en,
        color: category.color,
      })),
    };
  }

  if (palette.series_color) {
    const seriesColor = palette.series_color;
    return {
      ...legend,
      color: seriesColor,
      items: legend.items?.map((item) => ({ ...item, color: seriesColor })),
    };
  }

  return legend;
}

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
  /** Id of the map layer this AOI belongs to — used to remove it. */
  layerId: string;
  name: string;
}

export function useLegendHook() {
  const [layers, setLayers] = useState<LegendLayer[]>([]);
  const { palettesByDatasetId } = useDatasetsCatalog();

  const {
    layers: managedLayers,
    setLayerOpacity,
    removeLayer,
    reorderLayers,
  } = useMapStore();

  useEffect(() => {
    const buildEntries = (): LegendLayer[] => {
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
        if (layer.parentLayerId) continue;
        if (isAreaLayer(layer)) continue;

        const relatedDataset = DATASET_CARDS.find(
          (d) => `dataset-${d.dataset_id}` === layer.id
        );
        if (!relatedDataset?.legend) continue;

        const legend = applyPaletteOverride(
          relatedDataset.legend,
          palettesByDatasetId[relatedDataset.dataset_id]
        );
        const { title, info, note } = legend;

        const yearParam = buildYearParam(layer.startDate, layer.endDate);
        const params = buildParams(layer.parameters ?? {}, yearParam);

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

      return entries;
    };

    setLayers(buildEntries());
  }, [managedLayers, palettesByDatasetId]);

  // One chip per visible area layer, using the selection name as the label.
  // The visible layer IS the scope — removing the chip removes the layer.
  const aois: LegendAoi[] = managedLayers.filter(isAreaLayer).map((l) => ({
    layerId: l.id,
    name: l.selectionName ?? l.name,
  }));

  const handleRemoveAoi = useCallback(
    (layerId: string) => removeLayer(layerId),
    [removeLayer]
  );

  const handleLayerAction = useCallback<LayerActionHandler>(
    ({ action, payload }) => {
      if (action === "reorder") {
        reorderLayers(payload.layers.map((l) => l.id));
        return;
      }

      switch (action) {
        case "remove":
          // The visible layer IS the scope — removing it is the only mutation.
          // Also drop any context sub-layers parented to this dataset layer.
          managedLayers
            .filter((l) => l.parentLayerId === payload.id)
            .forEach((l) => removeLayer(l.id));
          removeLayer(payload.id);
          break;
        case "opacity":
          setLayerOpacity(payload.id, payload.opacity / 100);
          break;
      }
    },
    [managedLayers, removeLayer, setLayerOpacity, reorderLayers]
  );

  return { layers, handleLayerAction, aois, handleRemoveAoi };
}
