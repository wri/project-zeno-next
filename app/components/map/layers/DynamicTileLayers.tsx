import { Layer, Source } from "react-map-gl/maplibre";
import useMapStore from "@/app/store/mapStore";

function layerId(id: string) {
  return `tile-layer-${id}`;
}

/**
 * Renders tile layers on the map with z-ordering that matches the legend.
 *
 * tileLayers[0] = top of legend = top of map.
 * Each layer uses `beforeId` to position itself below the previous layer,
 * so that react-map-gl calls `map.moveLayer()` on reorder.
 */
function DynamicTileLayers() {
  const rasterLayers = useMapStore((s) => s.layers.filter((l) => l.type === "raster" && l.tileUrl));

  return (
    <>
      {rasterLayers.map((rasterLayer, index) => {
        const id = layerId(rasterLayer.id);

        // Place this layer below the previous one in the array.
        // tileLayers[0] has no beforeId (topmost).
        // tileLayers[1] has beforeId = tileLayers[0]'s id (placed below it).
        const aboveLayer = index > 0 ? rasterLayers[index - 1] : undefined;
        const beforeId = aboveLayer
          ? layerId(aboveLayer.id)
          : undefined;

        return (
          <Source
            key={rasterLayer.id}
            id={`tile-source-${rasterLayer.id}`}
            type="raster"
            tiles={[rasterLayer.tileUrl ?? ""]}
            tileSize={256}
          >
            <Layer
              id={id}
              type="raster"
              beforeId={beforeId}
              paint={{
                "raster-opacity": rasterLayer.visible
                  ? rasterLayer.opacity || 0.8
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
