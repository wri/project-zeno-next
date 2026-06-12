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

import useContextStore from "@/app/store/contextStore";
import useMapStore from "@/app/store/mapStore";

import { useFeatureFlag } from "@/app/hooks/useFeatureFlag";
import { showAnalysisCta } from "@/app/lib/analysis/showAnalysisCta";

import {
  getAoiName,
  getSrcId,
  getSubtype,
  singularizeDatasetName,
  toAreaSelection,
} from "@/app/utils/areaHelpers";

import AreaTooltip, { HoverInfo } from "@/app/components/ui/AreaTooltip";
import { selectAreaFillPaint, selectAreaLinePaint } from "./mapStyles";
import "@/app/theme/popup.css";

interface SourceLayerProps {
  layerId: LayerId;
}

interface Metadata {
  layer_id_mapping: Record<string, string>;
  gadm_subtype_mapping?: Record<string, string>;
  subregion_to_subtype_mapping?: Record<string, string>;
}

function VectorAreasLayer({ layerId }: SourceLayerProps) {
  const { context, addContext, removeContext } = useContextStore();
  const { addToRegistry, addLayer, setSelectAreaLayer, setAnalysis } =
    useMapStore();
  const isAnalysisEnabled = useFeatureFlag("analysis");
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
            const featureProps = feature.properties;
            const layerConfig = selectLayerOptions.find(
              (opt) => opt.id === layerId
            );
            const dynamicSrcId = getSrcId(layerId, featureProps, metadata!);
            const dynamicSubtype = getSubtype(layerId, featureProps, metadata!);

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

            const idField = metadata?.layer_id_mapping?.[layerId.toLowerCase()];

            // Only one vector-click AOI at a time. Skip entirely if this src_id is
            // already the active selection (avoids remove+re-add on double-click).
            // Custom (drawn/uploaded) areas — identified by aoiData.source === "custom"
            // — are left untouched.
            const alreadyInContext = context.some(
              (c) =>
                c.contextType === "area" && c.aoiData?.src_id === dynamicSrcId
            );
            if (!alreadyInContext) {
              context
                .filter(
                  (c) =>
                    c.contextType === "area" && c.aoiData?.source !== "custom"
                )
                .forEach((c) => removeContext(c.id));

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

            // Analysis feature — hidden behind ?ff=analysis; GADM only.
            // Purely additive: with the flag off, behavior is unchanged.
            if (layerId === "GADM" && metadata && isAnalysisEnabled) {
              const selection = toAreaSelection(
                layerId,
                (featureProps ?? {}) as Record<string, unknown>,
                metadata
              );
              setAnalysis(selection);
              // Surfaces the analyse nudge in the chat stream when a dataset
              // is active; without one, the selection alone is kept.
              showAnalysisCta(selection);
            }
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
    removeContext,
    context,
    addToRegistry,
    addLayer,
    layerId,
    url,
    isAnalysisEnabled,
    setAnalysis,
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
