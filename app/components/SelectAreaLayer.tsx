import { Layer, Source } from "react-map-gl/maplibre";
import useMapStore from "../store/mapStore";
import { selectLayerOptions } from "../types/map";

function SelectAreaLayer() {
  const { selectAreaLayer } = useMapStore();
  const selectAreaLayerConfig = selectLayerOptions.find(({ id }) => id === selectAreaLayer);

  if (selectAreaLayerConfig) {
    return (
      <Source
        id={`select-layer-source-${selectAreaLayerConfig.id}`}
        key={`select-layer-source-${selectAreaLayerConfig.id}`}
        type="vector"
        tiles={[selectAreaLayerConfig.url]}
      >
        <Layer
          id={`select-layer-line-${selectAreaLayerConfig.id}`}
          type="line"
          source-layer={selectAreaLayerConfig.sourceLayer}
          paint={{
            'line-color': "#BBC5EB",
            'line-width': 2
          }}
        />
      </Source>
    );
  }

  return null;
}

export default SelectAreaLayer;
