import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import useMapStore from "@/app/store/mapStore";
import type { Layer as ManagedLayer } from "@/app/store/layerManagerSlice";

// Sentinel layer ID used to cap raster layers below GeoJSON/AOI layers.
// Map.tsx adds this sentinel layer before DynamicTileLayers so it exists
// when the first raster layer references it as beforeId.
export const RASTER_TOP_SENTINEL_ID = "raster-top-sentinel";

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
  const rasterLayers = useMemo(() => {
    const rasters = allLayers.filter(
      (l): l is ManagedLayer & { tileUrl: string } =>
        l.type === "raster" && !!l.tileUrl
    );
    // Imagery mosaics are opaque, basemap-like layers: keep them at the
    // bottom of the raster stack regardless of insertion order so dataset
    // and context overlays stay visible above them.
    return [
      ...rasters.filter((l) => !l.imagery),
      ...rasters.filter((l) => l.imagery),
    ];
  }, [allLayers]);

  return (
    <>
      {rasterLayers.map((rasterLayer, index) => {
        const id = layerId(rasterLayer.id);

        // Place this layer below the previous one in the array.
        // rasterLayers[0] is anchored below the sentinel (so GeoJSON/AOI layers
        // added after the sentinel remain on top).
        // rasterLayers[1] has beforeId = rasterLayers[0]'s id (placed below it).
        const aboveLayer = index > 0 ? rasterLayers[index - 1] : undefined;
        const beforeId = aboveLayer
          ? layerId(aboveLayer.id)
          : RASTER_TOP_SENTINEL_ID;

        // Optional source tuning (set on imagery layers from their TileJSON).
        // Spread conditionally so unset keys stay out of the source spec.
        const sourceOptions = {
          ...(rasterLayer.minzoom !== undefined
            ? { minzoom: rasterLayer.minzoom }
            : {}),
          ...(rasterLayer.maxzoom !== undefined
            ? { maxzoom: rasterLayer.maxzoom }
            : {}),
          ...(rasterLayer.bounds ? { bounds: rasterLayer.bounds } : {}),
          ...(rasterLayer.attribution
            ? { attribution: rasterLayer.attribution }
            : {}),
        };

        return (
          <Source
            key={rasterLayer.id}
            id={`tile-source-${rasterLayer.id}`}
            type="raster"
            tiles={[rasterLayer.tileUrl]}
            tileSize={256}
            {...sourceOptions}
          >
            <Layer
              id={id}
              type="raster"
              beforeId={beforeId}
              paint={{
                "raster-opacity": rasterLayer.visible
                  ? (rasterLayer.opacity ?? 0.8)
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
