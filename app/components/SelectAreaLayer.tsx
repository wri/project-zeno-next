import { Layer, MapMouseEvent, Source, useMap } from "react-map-gl/maplibre";
import { LayerId, selectLayerOptions } from "../types/map";
import { useEffect } from "react";
import useContextStore from "../store/contextStore";

interface SourceLayerProps {
  layerId: LayerId;
}

function SelectAreaLayer({ layerId }: SourceLayerProps) {
  const { addContext } = useContextStore();
  const {current: map} = useMap();
  const selectAreaLayerConfig = selectLayerOptions.find(({ id }) => id === layerId);
  const { id, url, sourceLayer, nameKeys } = selectAreaLayerConfig!;

  const sourceId = `select-layer-source-${id}`
  const fillLayerName = `select-layer-fill-${id}`;

  useEffect(() => {
    let hoverId: string | number | undefined;

    if (map) {
      const onMouseMove = (e: MapMouseEvent) => {
        if (e.features && e.features.length > 0) {
          if (hoverId !== undefined) {
            map.setFeatureState(
              { source: sourceId, sourceLayer, id: hoverId },
              { hover: false }
            );
          }
          hoverId = e.features[0].id;
          map.setFeatureState(
            { source: sourceId, sourceLayer, id: hoverId },
            { hover: true }
          );
        }
      }

      const onMouseLeave = () => {
        if (hoverId !== undefined) {
            map.setFeatureState(
              { source: sourceId, sourceLayer, id: hoverId },
              { hover: false }
            );
        }
        hoverId = undefined;
      }

      const onClick = (e: MapMouseEvent) => {
        if (e.features && e.features.length > 0) {
          // Depending on the layer, the name property has a different key.
          // Using nameKeys of the layer config to find the right value.
          const aoiName = nameKeys.reduce(
            (acc: string, key: string) => e.features![0].properties[key] || acc,
            ""
          );

          addContext({
            contextType: "area",
            content: aoiName,
          });
        }
      }

      map.on("mousemove", fillLayerName, onMouseMove);
      map.on("mouseleave", fillLayerName, onMouseLeave);
      map.on("click", fillLayerName, onClick)

      return () => {
        map.off("mousemove", fillLayerName, onMouseMove);
        map.off("mouseleave", fillLayerName, onMouseLeave);
        map.off("click", fillLayerName, onClick)
      }
    }
  }, [map, fillLayerName, sourceId, sourceLayer]);

  return (
    <Source
      id={sourceId}
      key={sourceId}
      type="vector"
      tiles={[url]}
      promoteId="gfw_fid"
    >
      <Layer
        id={fillLayerName}
        type="fill"
        source-layer={sourceLayer}
        paint={{
          'fill-color': '#fff',
          'fill-opacity': 0
        }}
      />
      <Layer
        id={`select-layer-line-${id}`}
        type="line"
        source-layer={sourceLayer}
        paint={{
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
              "#4B88D8",
            "#BBC5EB",
          ],
          'line-width': 2
        }}
      />
    </Source>
  );
}

export default SelectAreaLayer;
