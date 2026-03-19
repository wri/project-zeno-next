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
  const { tileLayers } = useMapStore();

  return (
    <>
      {tileLayers.map((tileLayer, index) => {
        const id = layerId(tileLayer.id);

        // Place this layer below the previous one in the array.
        // tileLayers[0] has no beforeId (topmost).
        // tileLayers[1] has beforeId = tileLayers[0]'s id (placed below it).
        const aboveLayer = index > 0 ? tileLayers[index - 1] : undefined;
        const beforeId = aboveLayer
          ? layerId(aboveLayer.id)
          : undefined;

        return (
          <Source
            key={tileLayer.id}
            id={`tile-source-${tileLayer.id}`}
            type="raster"
            tiles={[tileLayer.url]}
            tileSize={256}
          >
            <Layer
              id={id}
              type="raster"
              beforeId={beforeId}
              paint={{
                "raster-opacity": tileLayer.visible
                  ? tileLayer.opacity || 0.8
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
