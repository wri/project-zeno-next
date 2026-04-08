import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import useMapStore from "@/app/store/mapStore";
import type { Layer as ManagedLayer } from "@/app/store/layerManagerSlice";

function layerId(id: string) {
  return `tile-layer-${id}`;
}

/**
 * Renders raster layers from the unified layer manager with z-ordering
 * that matches the legend.
 *
 * rasterLayers[0] = top of legend = top of map.
 * Each layer uses `beforeId` to position itself below the previous layer,
 * so that react-map-gl calls `map.moveLayer()` on reorder.
 */
function DynamicTileLayers() {
  const allLayers = useMapStore((s) => s.layers);
  const rasterLayers = useMemo(
    () => allLayers.filter(
      (l): l is ManagedLayer & { tileUrl: string } => l.type === "raster" && !!l.tileUrl
    ),
    [allLayers]
  );

  return (
    <>
      {rasterLayers.map((rasterLayer, index) => {
        const id = layerId(rasterLayer.id);

        // Place this layer below the previous one in the array.
        // rasterLayers[0] has no beforeId (topmost).
        // rasterLayers[1] has beforeId = rasterLayers[0]'s id (placed below it).
        const aboveLayer = index > 0 ? rasterLayers[index - 1] : undefined;
        const beforeId = aboveLayer
          ? layerId(aboveLayer.id)
          : undefined;

        return (
          <Source
            key={rasterLayer.id}
            id={`tile-source-${rasterLayer.id}`}
            type="raster"
            tiles={[rasterLayer.tileUrl]}
            tileSize={256}
          >
            <Layer
              id={id}
              type="raster"
              beforeId={beforeId}
              paint={{
                "raster-opacity": rasterLayer.visible
                  ? rasterLayer.opacity ?? 0.8
                  : 0,
              }}
            />
          </Source>
        );
      })}
    </>
  );
}

export default DynamicTileLayers;
