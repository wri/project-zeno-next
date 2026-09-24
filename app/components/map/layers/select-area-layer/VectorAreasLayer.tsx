import { useEffect, useState } from "react";
import { Layer, MapMouseEvent, Source, useMap } from "react-map-gl/maplibre";
import { union } from "@turf/union";
import {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";

import { LayerId, selectLayerOptions } from "@/app/types/map";
import { API_CONFIG } from "@/app/config/api";

import useMapStore from "@/app/store/mapStore";
import { isAreaLayer } from "@/app/store/layerManagerSlice";

import { getAoiName, getSrcId, getSubtype } from "@/app/utils/areaHelpers";

import AreaTooltip, { HoverInfo } from "@/app/components/ui/AreaTooltip";
import { getBoundaryFeatureDetails } from "@/app/utils/boundaryFeatureDetails";
import { selectAreaFillPaint, selectAreaLinePaint } from "./mapStyles";
import "@/app/theme/popup.css";
import { publishAreaSelection } from "./publishAreaSelection";

interface SourceLayerProps {
  layerId: LayerId;
}

interface Metadata {
  layer_id_mapping: Record<string, string>;
  gadm_subtype_mapping?: Record<string, string>;
  subregion_to_subtype_mapping?: Record<string, string>;
}

function VectorAreasLayer({ layerId }: SourceLayerProps) {
  const { addToRegistry, addLayer } = useMapStore();
  const { current: map } = useMap();
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>();
  const [metadata, setMetadata] = useState<Metadata | null>(null);

  const selectAreaLayerConfig = selectLayerOptions.find(
    ({ id }) => id === layerId
  );
  const { id, url, sourceLayer, nameKeys } = selectAreaLayerConfig!;

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
          map.getCanvas().style.cursor = "pointer";
          setHoverInfo({
            lat,
            lng,
            name: aoiName,
            details: getBoundaryFeatureDetails(layerId, feature!.properties),
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
        map.getCanvas().style.cursor = "";
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
            const featureProps = feature.properties;
            // A click can land before /api/metadata resolves; the area still
            // draws, just without an id (publishAreaSelection then clears).
            const dynamicSrcId = metadata
              ? getSrcId(layerId, featureProps, metadata)
              : undefined;
            const dynamicSubtype = metadata
              ? getSubtype(layerId, featureProps, metadata)
              : undefined;

            const sourceFeatures = map.querySourceFeatures(sourceId, {
              sourceLayer: sourceLayer,
              filter: ["in", "gfw_fid", feature.properties?.gfw_fid],
            });
            if (sourceFeatures.length === 1) {
              addToRegistry({
                ref: { name: aoiName, source: layerId },
                data: sourceFeatures[0],
                srcId: dynamicSrcId,
                subtype: dynamicSubtype,
              });
              addLayer({
                id: aoiName,
                name: aoiName,
                type: "geojson",
                visible: true,
                featureRefs: [{ name: aoiName, source: layerId }],
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
                addToRegistry({
                  ref: { name: aoiName, source: layerId },
                  data: f,
                  srcId: dynamicSrcId,
                  subtype: dynamicSubtype,
                });
                addLayer({
                  id: aoiName,
                  name: aoiName,
                  type: "geojson",
                  visible: true,
                  featureRefs: [{ name: aoiName, source: layerId }],
                });
              }
            }

            // Only one vector-click AOI at a time: clicking a new boundary
            // replaces any previous non-custom area selection (admin clicks +
            // assistant picks), leaving custom (drawn/uploaded) areas — whose
            // feature refs use source "custom" — untouched. The visible layer
            // IS the scope, so we mutate layers directly instead of a context
            // item. addLayer (above) is keyed by aoiName, so a double-click
            // just replaces in place; we only need to drop the others.
            const { layers: currentLayers, removeLayer } =
              useMapStore.getState();
            const justAdded = currentLayers.some((l) => l.id === aoiName);
            if (justAdded) {
              currentLayers
                .filter(
                  (l) =>
                    l.id !== aoiName &&
                    isAreaLayer(l) &&
                    !(l.featureRefs ?? []).some((r) => r.source === "custom")
                )
                .forEach((l) => removeLayer(l.id));
            }

            // Publish the clicked area as the analysis selection both nudges
            // consume (any source with a backend id; see publishAreaSelection).
            publishAreaSelection({ layerId, featureProps, metadata });
          }
        }
      };

      map.on("mousemove", fillLayerName, onMouseMove);
      map.on("mouseleave", fillLayerName, onMouseLeave);
      map.on("click", fillLayerName, onClick);

      return () => {
        map.off("mousemove", fillLayerName, onMouseMove);
        map.off("mouseleave", fillLayerName, onMouseLeave);
        map.off("click", fillLayerName, onClick);
        map.getCanvas().style.cursor = "";
      };
    }
  }, [
    map,
    fillLayerName,
    sourceId,
    sourceLayer,
    nameKeys,
    metadata,
    addToRegistry,
    addLayer,
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
          paint={selectAreaFillPaint}
        />
        <Layer
          id={`select-layer-line-${id}`}
          type="line"
          source-layer={sourceLayer}
          paint={selectAreaLinePaint}
        />
      </Source>
      {hoverInfo && <AreaTooltip hoverInfo={hoverInfo} />}
    </>
  );
}

export default VectorAreasLayer;
