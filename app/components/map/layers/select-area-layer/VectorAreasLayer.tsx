import { useEffect, useState } from "react";
import { Layer, MapMouseEvent, Source, useMap } from "react-map-gl/maplibre";
import { union } from "@turf/union";
import "../../../../theme/popup.css";

import { LayerId, selectLayerOptions } from "../../../../types/map";
import useContextStore from "../../../../store/contextStore";
import useMapStore from "../../../../store/mapStore";
import { API_CONFIG } from "../../../../config/api";
import {
  getAoiName,
  getSrcId,
  getSubtype,
  singularizeDatasetName,
} from "../../../../utils/areaHelpers";
import {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";
import AreaTooltip, { HoverInfo } from "../../../ui/AreaTooltip";

interface SourceLayerProps {
  layerId: LayerId;
}

interface Metadata {
  layer_id_mapping: Record<string, string>;
  gadm_subtype_mapping?: Record<string, string>;
  subregion_to_subtype_mapping?: Record<string, string>;
}

function VectorAreasLayer({ layerId }: SourceLayerProps) {
  const { addContext } = useContextStore();
  const { addGeoJsonFeature, setSelectAreaLayer } = useMapStore();
  const { current: map } = useMap();
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>();
  const [metadata, setMetadata] = useState<Metadata | null>(null);

  const selectAreaLayerConfig = selectLayerOptions.find(
    ({ id }) => id === layerId
  );
  const {
    id,
    url,
    sourceLayer,
    name: datasetName,
    nameKeys,
  } = selectAreaLayerConfig!;

  const sourceId = `select-layer-source-${id}`;
  const fillLayerName = `select-layer-fill-${id}`;

  // Fetch metadata on component mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(API_CONFIG.ENDPOINTS.METADATA);
        const data = await response.json();
        setMetadata(data);
        console.log("Fetched metadata:", data);
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      }
    };

    fetchMetadata();
  }, []);

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
            name: aoiName,
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
      };

      const onMouseLeave = () => {
        setHoverInfo(undefined);
        if (hoverId !== undefined) {
          map.setFeatureState(
            { source: sourceId, sourceLayer, id: hoverId },
            { hover: false }
          );
        }
        hoverId = undefined;
      };

      const onClick = (e: MapMouseEvent) => {
        if (e.features && e.features.length > 0) {
          // Depending on the layer, the name property has a different key.
          // Using nameKeys of the layer config to find the right value.
          const aoiName = getAoiName(nameKeys, e.features.at(-1)!.properties);

          const feature = e.features.at(-1);

          if (feature) {
            const id = aoiName;
            const sourceFeatures = map.querySourceFeatures(sourceId, {
              sourceLayer: sourceLayer,
              filter: ["in", "gfw_fid", feature.properties?.gfw_fid],
            });
            if (sourceFeatures.length === 1) {
              addGeoJsonFeature({
                id: id,
                name: aoiName,
                data: sourceFeatures[0],
              });
            } else if (sourceFeatures.length > 1) {
              const collection: FeatureCollection<
                Polygon | MultiPolygon,
                GeoJsonProperties
              > = {
                type: "FeatureCollection",
                features: sourceFeatures as Feature<
                  Polygon | MultiPolygon,
                  GeoJsonProperties
                >[],
              };
              const f = union(collection);
              if (f) {
                addGeoJsonFeature({
                  id: id,
                  name: aoiName,
                  data: f,
                });
              }
            }
            // Extract AOI data for ui_context
            const featureProps = feature.properties;
            const layerConfig = selectLayerOptions.find(
              (opt) => opt.id === layerId
            );

            // Get dynamic src_id and subtype using metadata
            const dynamicSrcId = getSrcId(layerId, featureProps, metadata!);
            const dynamicSubtype = getSubtype(layerId, featureProps, metadata!);

            const idField = metadata?.layer_id_mapping?.[layerId.toLowerCase()];

            addContext({
              contextType: "area",
              content: aoiName,
              aoiData: {
                name: aoiName,
                ...(idField ? { [idField]: dynamicSrcId } : {}),
                src_id: dynamicSrcId,
                subtype: dynamicSubtype,
                source: layerConfig?.id.toLowerCase(),
              },
            });
          }
        }
      };

      const onKeyUp = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setSelectAreaLayer(null);
        }
      };

      map.on("mousemove", fillLayerName, onMouseMove);
      map.on("mouseleave", fillLayerName, onMouseLeave);
      map.on("click", fillLayerName, onClick);
      document.addEventListener("keyup", onKeyUp);

      return () => {
        map.off("mousemove", fillLayerName, onMouseMove);
        map.off("mouseleave", fillLayerName, onMouseLeave);
        map.off("click", fillLayerName, onClick);
        document.removeEventListener("keyup", onKeyUp);
      };
    }
  }, [
    map,
    fillLayerName,
    sourceId,
    sourceLayer,
    nameKeys,
    setSelectAreaLayer,
    metadata,
    addContext,
    addGeoJsonFeature,
    layerId,
    url,
  ]);

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
            "fill-color": "#4B88D8",
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.48,
              ["boolean", ["feature-state", "selected"], false],
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
            "line-color": "#BBC5EB",
            "line-width": 2,
          }}
        />
      </Source>
      {hoverInfo && (
        <AreaTooltip
          hoverInfo={hoverInfo}
          areaName={singularizeDatasetName(datasetName)}
        />
      )}
    </>
  );
}

export default VectorAreasLayer;
