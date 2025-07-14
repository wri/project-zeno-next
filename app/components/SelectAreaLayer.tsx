import { useEffect, useState } from "react";
import { Layer, MapMouseEvent, Popup, Source, useMap } from "react-map-gl/maplibre";

import { LayerId, selectLayerOptions } from "../types/map";
import useContextStore from "../store/contextStore";

interface SourceLayerProps {
  layerId: LayerId;
}

interface HoverInfo {
  lng: number;
  lat: number;
  name: string;
}

function getAoiName(nameKeys: readonly string[], properties: {[key: string]: string}) {
  return nameKeys.reduce(
    (acc: string, key: string) => properties[key] || acc,
    ""
  );
}

function SelectAreaLayer({ layerId }: SourceLayerProps) {
  const { addContext } = useContextStore();
  const {current: map} = useMap();
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>();
  const [selectedArea, setSelectedArea] = useState<string|number>();

  const selectAreaLayerConfig = selectLayerOptions.find(({ id }) => id === layerId);
  const { id, url, sourceLayer, nameKeys } = selectAreaLayerConfig!;

  const sourceId = `select-layer-source-${id}`
  const fillLayerName = `select-layer-fill-${id}`;

  useEffect(() => {
    let hoverId: string | number | undefined;

    if (map) {
      const onMouseMove = (e: MapMouseEvent) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features.at(-1);
          const { lat, lng } = e.lngLat;
          const aoiName = getAoiName(nameKeys, feature!.properties);
          setHoverInfo({
            lat,
            lng,
            name: aoiName
          });

          if (hoverId !== undefined) {
            map.setFeatureState(
              { source: sourceId, sourceLayer, id: hoverId },
              { hover: false }
            );
          }
          hoverId = feature!.id;
          map.setFeatureState(
            { source: sourceId, sourceLayer, id: hoverId },
            { hover: true }
          );
        }
      }

      const onMouseLeave = () => {
        setHoverInfo(undefined);
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
          const aoiName = getAoiName(nameKeys, e.features.at(-1)!.properties);

          const selectedId = e.features.at(-1)!.id;
          setSelectedArea(selectedId);
          map.setFeatureState(
            { source: sourceId, sourceLayer, id: selectedId },
            { selected: true }
          );
          addContext({
            contextType: "area",
            content: aoiName,
          });

          map.off("mousemove", fillLayerName, onMouseMove);
          map.off("mouseleave", fillLayerName, onMouseLeave);
          map.off("click", fillLayerName, onClick);
        }
      }

      map.on("mousemove", fillLayerName, onMouseMove);
      map.on("mouseleave", fillLayerName, onMouseLeave);
      map.on("click", fillLayerName, onClick);

      return () => {
        map.off("mousemove", fillLayerName, onMouseMove);
        map.off("mouseleave", fillLayerName, onMouseLeave);
        map.off("click", fillLayerName, onClick);
      }
    }
  }, [map, fillLayerName, sourceId, sourceLayer, nameKeys, addContext]);

  return (
    <>
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
          filter={
            selectedArea
            ? ['match', ['get', 'gfw_fid'], selectedArea, true, false]
            : ['boolean', true]
          }
          paint={{
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              "#4B88D8",
              ['boolean', ['feature-state', 'selected'], false],
              "#4B88D8",
              "#BBC5EB",
            ],
            'line-width': 2
          }}
        />
      </Source>
      {hoverInfo && (
        <Popup
          longitude={hoverInfo.lng}
          latitude={hoverInfo.lat}
          offset={[0, -10] as [number, number]}
          closeButton={false}
          className="county-info"
        >
          <p style={{  margin: 0 }}><b>{hoverInfo.name}</b></p>
          <p style={{  margin: 0 }}>Click to select admin area. Esc to exit.</p>
        </Popup>
      )}
    </>
  );
}

export default SelectAreaLayer;
