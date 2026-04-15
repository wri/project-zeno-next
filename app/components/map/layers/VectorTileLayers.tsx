import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import useMapStore from "@/app/store/mapStore";
import type { Layer as ManagedLayer } from "@/app/store/layerManagerSlice";
import type { ContextItem } from "@/app/store/contextStore";

interface VectorTileLayersProps {
  areas: ContextItem[];
}

/**
 * Renders managed vector tile (MVT/PBF) layers from the layer store.
 * Applies context-aware styling: blue when the layer is the active area
 * context, gray otherwise — consistent with GeoJsonLayers.
 */
function VectorTileLayers({ areas }: VectorTileLayersProps) {
  const allLayers = useMapStore((s) => s.layers);
  const vectorLayers = useMemo(
    () =>
      allLayers.filter(
        (l): l is ManagedLayer & { tileUrl: string; sourceLayer: string } =>
          l.type === "vector" && !!l.tileUrl && !!l.sourceLayer,
      ),
    [allLayers],
  );

  return (
    <>
      {vectorLayers.map((layer) => {
        const sourceId = `vector-tile-source-${layer.id}`;
        const fillLayerId = `vector-tile-fill-${layer.id}`;
        const lineLayerId = `vector-tile-line-${layer.id}`;

        const isInContext = areas.some(
          (a) =>
            a.aoiSelection?.name === layer.name || a.content === layer.name,
        );

        const lineColor = isInContext ? "#8EA4E8" : "#666E7B";
        const lineOpacity = !layer.visible ? 0 : isInContext ? 1 : 0.5;
        const opacity = layer.opacity ?? 1;

        return (
          <Source
            key={layer.id}
            id={sourceId}
            type="vector"
            tiles={[layer.tileUrl]}
          >
            {/* Subtle fill to make features selectable visually */}
            <Layer
              id={fillLayerId}
              type="fill"
              source-layer={layer.sourceLayer}
              paint={{
                "fill-color": lineColor,
                "fill-opacity": isInContext ? 0.06 * opacity : 0,
              }}
            />
            <Layer
              id={lineLayerId}
              type="line"
              source-layer={layer.sourceLayer}
              paint={{
                "line-color": lineColor,
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  2,
                  0.4,
                  6,
                  0.8,
                  10,
                  1.5,
                ],
                "line-opacity": lineOpacity * opacity,
              }}
            />
          </Source>
        );
      })}
    </>
  );
}

export default VectorTileLayers;
