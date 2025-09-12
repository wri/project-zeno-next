import { Layer, Source } from "react-map-gl/maplibre";
import useMapStore from "@/app/store/mapStore";

function DynamicTileLayers() {
  const { tileLayers } = useMapStore();

  return (
    <>
      {tileLayers.map((tileLayer) => (
        <Source
          key={tileLayer.id}
          id={`tile-source-${tileLayer.id}`}
          type="raster"
          tiles={[tileLayer.url]}
          tileSize={256}
        >
          <Layer
            id={`tile-layer-${tileLayer.id}`}
            type="raster"
            paint={{
              "raster-opacity": tileLayer.visible
                ? tileLayer.opacity || 0.8
                : 0,
            }}
          />
        </Source>
      ))}
    </>
  );
}

export default DynamicTileLayers;
