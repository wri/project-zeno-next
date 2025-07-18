import { useEffect, useState } from "react";
import { Layer, MapMouseEvent, Popup, Source, useMap } from "react-map-gl/maplibre";
import { union } from "@turf/union";

import { LayerId, LayerName, selectLayerOptions } from "../types/map";
import useContextStore from "../store/contextStore";
import useMapStore from "../store/mapStore";
import { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson";

interface SourceLayerProps {
  layerId: LayerId;
  beforeId?: string;
}

interface HoverInfo {
  lng: number;
  lat: number;
  name: string;
}

function getAoiName(nameKeys: readonly string[], properties: {[key: string]: string}): string {
  return nameKeys.reduce(
    (acc: string, key: string, idx: number) => properties[key]
      ? `${properties[key]}${ idx > 0 ? ", ": ""}${acc}`
      : acc,
    ""
  );
}

function singularizeDatasetName(name: LayerName): string {
  if (name.endsWith("s")) {
    return name.slice(0, -1);
  }

  return name;
}

function SelectAreaLayer({ layerId, beforeId }: SourceLayerProps) {
  const { addContext } = useContextStore();
  const { addSelectedArea } = useMapStore();
  const {current: map} = useMap();
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>();

  const selectAreaLayerConfig = selectLayerOptions.find(({ id }) => id === layerId);
  const { id, url, sourceLayer, name: datasetName, nameKeys } = selectAreaLayerConfig!;

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

          const feature = e.features.at(-1);

          if (feature) {
            const sourceFeatures = map.querySourceFeatures(sourceId, {
              sourceLayer: sourceLayer,
              filter: ['in', 'gfw_fid', feature.properties?.gfw_fid]
            });
            if (sourceFeatures.length === 1) {
              addSelectedArea(sourceFeatures[0]);
            } else if (sourceFeatures.length > 1) {
              const collection: FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties> = {
                type: "FeatureCollection",
                features: sourceFeatures as Feature<Polygon | MultiPolygon, GeoJsonProperties>[]
              };
              const f = union(collection);
              if (f) {
                addSelectedArea(f);
              }
            }
            addContext({
              contextType: "area",
              content: aoiName,
            });
          }
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
  }, [map, fillLayerName, sourceId, sourceLayer, nameKeys, addContext, addSelectedArea]);

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
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.16,
              ['boolean', ['feature-state', 'selected'], false],
              0.08,
              0,
            ],
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
          beforeId={beforeId}
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
          <p style={{  margin: 0 }}>{`Click to select ${singularizeDatasetName(datasetName)}. Esc to exit.`}</p>
        </Popup>
      )}
    </>
  );
}

export default SelectAreaLayer;
