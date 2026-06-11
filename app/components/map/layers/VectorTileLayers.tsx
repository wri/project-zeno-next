import { useMemo, useState, useEffect } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import useMapStore from "@/app/store/mapStore";
import type { Layer as ManagedLayer } from "@/app/store/layerManagerSlice";
import type { ContextItem } from "@/app/store/contextStore";
import type { BasemapTheme } from "../BasemapSelector";

interface VectorTileLayersProps {
  areas: ContextItem[];
  basemapTheme: BasemapTheme;
}

/**
 * Renders managed vector tile (MVT/PBF) layers from the layer store.
 * Applies context-aware styling: blue when the layer is the active area
 * context, gray otherwise — consistent with GeoJsonLayers.
 */
function VectorTileLayers({ areas, basemapTheme }: VectorTileLayersProps) {
  const allLayers = useMapStore((s) => s.layers);
  const mapRef = useMapStore((s) => s.mapRef);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);

  const vectorLayers = useMemo(
    () =>
      allLayers.filter(
        (l): l is ManagedLayer & { tileUrl: string; sourceLayer: string } =>
          l.type === "vector" && !!l.tileUrl && !!l.sourceLayer
      ),
    [allLayers]
  );

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const cleanups: Array<() => void> = [];

    for (const layer of vectorLayers) {
      const fillId = `vector-tile-fill-${layer.id}`;
      const enter = () => setHoveredLayerId(layer.id);
      const leave = () =>
        setHoveredLayerId((prev) => (prev === layer.id ? null : prev));

      map.on("mouseenter", fillId, enter);
      map.on("mouseleave", fillId, leave);
      cleanups.push(() => {
        map.off("mouseenter", fillId, enter);
        map.off("mouseleave", fillId, leave);
      });
    }

    return () => cleanups.forEach((c) => c());
  }, [mapRef, vectorLayers]);

  return (
    <>
      {vectorLayers.map((layer) => {
        const sourceId = `vector-tile-source-${layer.id}`;
        const fillLayerId = `vector-tile-fill-${layer.id}`;
        const lineLayerId = `vector-tile-line-${layer.id}`;

        const isInContext = areas.some(
          (a) => a.aoiSelection?.name === layer.name || a.content === layer.name
        );
        const isHovered = hoveredLayerId === layer.id;

        const lineColor = isInContext
          ? basemapTheme === "dark"
            ? "#FFFFFF"
            : "#8EA4E8"
          : "#666E7B";
        const casingColor = basemapTheme === "dark" ? "#0049aa" : "#FFFFFF";
        const lineOpacity = !layer.visible ? 0 : isInContext ? 1 : 0.5;
        const opacity = layer.opacity ?? 1;

        return (
          <Source
            key={layer.id}
            id={sourceId}
            type="vector"
            tiles={[layer.tileUrl]}
          >
            <Layer
              id={fillLayerId}
              type="fill"
              source-layer={layer.sourceLayer}
              paint={{
                "fill-color": "#172B7A",
                "fill-opacity": isHovered
                  ? 0.1 * opacity
                  : isInContext
                    ? 0.06 * opacity
                    : 0,
              }}
            />
            {/* Casing layer (wider, contrasting colour) rendered below the main line */}
            <Layer
              id={`${lineLayerId}-casing`}
              type="line"
              source-layer={layer.sourceLayer}
              paint={{
                "line-color": casingColor,
                "line-width": 5,
                "line-opacity": lineOpacity * opacity,
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
