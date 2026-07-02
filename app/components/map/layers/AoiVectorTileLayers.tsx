import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import useMapStore from "@/app/store/mapStore";
import { isAoiVectorLayer } from "@/app/store/layerManagerSlice";
import type { BasemapTheme } from "../BasemapSelector";

interface AoiVectorTileLayersProps {
  basemapTheme: BasemapTheme;
}

/**
 * Renders managed vector tile (MVT/PBF) AOI layers from the layer store.
 * Every visible AOI vector layer IS the query scope, so it always uses the
 * in-scope (highlighted) styling — consistent with GeoJsonLayers.
 */
function AoiVectorTileLayers({ basemapTheme }: AoiVectorTileLayersProps) {
  const allLayers = useMapStore((s) => s.layers);
  const vectorLayers = useMemo(
    () => allLayers.filter(isAoiVectorLayer),
    [allLayers]
  );

  return (
    <>
      {vectorLayers.map((layer) => {
        const sourceId = `vector-tile-source-${layer.id}`;
        const fillLayerId = `vector-tile-fill-${layer.id}`;
        const lineLayerId = `vector-tile-line-${layer.id}`;

        const lineColor = basemapTheme === "dark" ? "#FFFFFF" : "#8EA4E8";
        const casingColor = basemapTheme === "dark" ? "#0049aa" : "#FFFFFF";
        const lineOpacity = !layer.visible ? 0 : 1;
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
                "fill-opacity": 0.06 * opacity,
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

export default AoiVectorTileLayers;
