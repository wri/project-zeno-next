import { Layer, Source } from "react-map-gl/maplibre";
import useMapStore from "@/app/store/mapStore";

/** Simple djb2 hash → short hex string for use as a React key suffix. */
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

function DynamicTileLayers() {
  const { tileLayers } = useMapStore();

  return (
    <>
      {tileLayers.map((tileLayer) => {
        // Include a hash of the resolved URL in the key so that param changes
        // (which alter the URL) force maplibre to re-mount the source.
        const urlHash = hashStr(tileLayer.url);
        return (
          <Source
            key={`${tileLayer.id}-${urlHash}`}
            id={`tile-source-${tileLayer.id}-${urlHash}`}
            type="raster"
            tiles={[tileLayer.url]}
            tileSize={256}
          >
            <Layer
              id={`tile-layer-${tileLayer.id}-${urlHash}`}
              type="raster"
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
