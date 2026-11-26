import { useEffect, useState } from "react";
import type { LngLat, MapGeoJSONFeature, Point } from "maplibre-gl";
import { Layer, MapMouseEvent, Source, useMap } from "react-map-gl/maplibre";
import { union } from "@turf/union";
import {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
} from "geojson";

import {
  CONCESSION_STYLES,
  LayerId,
  selectLayerOptions,
} from "@/app/types/map";
import { API_CONFIG } from "@/app/config/api";

import useMapStore from "@/app/store/mapStore";

import { getFeatureName, getSrcId, getSubtype } from "@/app/utils/areaHelpers";

import AreaTooltip, { HoverInfo } from "@/app/components/ui/AreaTooltip";
import { getBoundaryFeatureDetails } from "@/app/utils/boundaryFeatureDetails";
import {
  concessionFillPaint,
  concessionLinePaint,
  selectAreaFillPaint,
  selectAreaLinePaint,
} from "./mapStyles";
import "@/app/theme/popup.css";
import { removeOtherReferenceAreas } from "@/app/utils/referenceArea";

import { publishAreaSelection } from "./publishAreaSelection";

// The hover tooltip only appears once the pointer rests on a boundary, so it
// doesn't flicker under the cursor while moving across the map.
const TOOLTIP_DEBOUNCE_MS = 500;

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
  const { id, url, sourceLayer } = selectAreaLayerConfig!;
  const concessionStyle = CONCESSION_STYLES[layerId];
  const boundaryOpacity = useMapStore((s) => s.boundaryOpacity);
  // A concession layer is drawn in its commodity's colour, outlined only
  // where GNW draws an outline; every other layer keeps the usual paint.
  const fillPaint = concessionStyle
    ? concessionFillPaint(concessionStyle, boundaryOpacity)
    : selectAreaFillPaint;
  const linePaint = !concessionStyle
    ? selectAreaLinePaint
    : concessionStyle.line &&
      concessionLinePaint(concessionStyle.line, boundaryOpacity);

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
    let tooltipTimer: ReturnType<typeof setTimeout> | undefined;
    // Where the pointer is over the map, in map pixels, whether or not a
    // boundary is under it; unset once it leaves the map.
    let pointer: Point | undefined;

    if (map) {
      const hideTooltip = () => {
        clearTimeout(tooltipTimer);
        setHoverInfo(undefined);
      };

      const showTooltipAfterRest = (
        properties: MapGeoJSONFeature["properties"],
        { lng, lat }: LngLat
      ) => {
        tooltipTimer = setTimeout(() => {
          setHoverInfo({
            lat,
            lng,
            name: getFeatureName(layerId, properties),
            details: getBoundaryFeatureDetails(layerId, properties),
          });
        }, TOOLTIP_DEBOUNCE_MS);
      };

      const highlight = (id: string | number | undefined) => {
        if (hoverId !== undefined) {
          map.setFeatureState(
            { source: sourceId, sourceLayer, id: hoverId },
            { hover: false }
          );
        }
        hoverId = id;
        map.setFeatureState(
          { source: sourceId, sourceLayer, id: hoverId },
          { hover: true }
        );
      };

      const onMouseMove = (e: MapMouseEvent) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features.at(-1)!;
          map.getCanvas().style.cursor = "pointer";

          // Hide while moving; show at the resting point once still. A pause
          // in the middle of a drag or zoom doesn't count as resting.
          hideTooltip();
          if (!map.isMoving()) {
            showTooltipAfterRest(feature.properties, e.lngLat);
          }
          highlight(feature.id);
        }
      };

      const onMouseLeave = () => {
        map.getCanvas().style.cursor = "";
        hideTooltip();
        if (hoverId !== undefined) {
          map.setFeatureState(
            { source: sourceId, sourceLayer, id: hoverId },
            { hover: false }
          );
        }
        hoverId = undefined;
      };

      // A pan or zoom moves the map under a still pointer without firing
      // mousemove: hide the card when the move starts, and once the map
      // settles, treat the pointer as resting on whatever is now under it.
      const onPointerMove = (e: MapMouseEvent) => {
        pointer = e.point;
      };
      const onPointerOut = () => {
        pointer = undefined;
      };

      const onMoveEnd = () => {
        if (!pointer) return;
        const feature = map
          .queryRenderedFeatures(pointer, { layers: [fillLayerName] })
          .at(-1);
        if (!feature) {
          onMouseLeave();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        highlight(feature.id);
        showTooltipAfterRest(feature.properties, map.unproject(pointer));
      };

      const onClick = (e: MapMouseEvent) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features.at(-1);

          if (feature) {
            const featureProps = feature.properties;
            // Depending on the layer, the name property has a different key;
            // getFeatureName reads the layer config's nameKeys.
            const aoiName = getFeatureName(layerId, featureProps);
            // A click can land before /api/metadata resolves; the area still
            // draws, just without an id (publishAreaSelection then clears).
            const dynamicSrcId = metadata
              ? getSrcId(layerId, featureProps, metadata)
              : undefined;
            const dynamicSubtype = metadata
              ? getSubtype(layerId, featureProps, metadata)
              : undefined;

            // The src id is part of the ref: two parcels can share a name,
            // and the registry keeps an entry per ref.
            const featureRef = {
              name: aoiName,
              source: layerId,
              srcId: dynamicSrcId,
            };

            const sourceFeatures = map.querySourceFeatures(sourceId, {
              sourceLayer: sourceLayer,
              filter: ["in", "gfw_fid", feature.properties?.gfw_fid],
            });
            if (sourceFeatures.length === 1) {
              addToRegistry({
                ref: featureRef,
                data: sourceFeatures[0],
                srcId: dynamicSrcId,
                subtype: dynamicSubtype,
              });
              addLayer({
                id: aoiName,
                name: aoiName,
                type: "geojson",
                visible: true,
                featureRefs: [featureRef],
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
                  ref: featureRef,
                  data: f,
                  srcId: dynamicSrcId,
                  subtype: dynamicSubtype,
                });
                addLayer({
                  id: aoiName,
                  name: aoiName,
                  type: "geojson",
                  visible: true,
                  featureRefs: [featureRef],
                });
              }
            }

            // One reference area at a time: a new boundary click replaces the
            // previous one (admin clicks, searched places, assistant picks).
            // addLayer (above) is keyed by aoiName, so a double-click just
            // replaces in place; we only need to drop the others.
            const justAdded = useMapStore
              .getState()
              .layers.some((l) => l.id === aoiName);
            if (justAdded) removeOtherReferenceAreas(aoiName);

            // Publish the clicked area as the analysis selection both nudges
            // consume (any source with a backend id; see publishAreaSelection).
            publishAreaSelection({ layerId, featureProps, metadata });
          }
        }
      };

      map.on("mousemove", fillLayerName, onMouseMove);
      map.on("mouseleave", fillLayerName, onMouseLeave);
      map.on("click", fillLayerName, onClick);
      map.on("mousemove", onPointerMove);
      map.on("mouseout", onPointerOut);
      map.on("movestart", hideTooltip);
      map.on("moveend", onMoveEnd);

      return () => {
        map.off("mousemove", fillLayerName, onMouseMove);
        map.off("mouseleave", fillLayerName, onMouseLeave);
        map.off("click", fillLayerName, onClick);
        map.off("mousemove", onPointerMove);
        map.off("mouseout", onPointerOut);
        map.off("movestart", hideTooltip);
        map.off("moveend", onMoveEnd);
        map.getCanvas().style.cursor = "";
        clearTimeout(tooltipTimer);
      };
    }
  }, [
    map,
    fillLayerName,
    sourceId,
    sourceLayer,
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
        // Spread, not maxzoom={…?.maxzoom}: MapLibre rejects a source with
        // maxzoom: undefined, so the other boundary layers would not draw.
        {...(concessionStyle ? { maxzoom: concessionStyle.maxzoom } : {})}
      >
        {/* Every <Layer> is a direct child: <Source> passes its id to each
            child, and a fragment cannot take that prop. A concession layer
            gets the usual hover tint on top of its fill; the events bind to
            the fill either way. */}
        <Layer
          id={fillLayerName}
          type="fill"
          source-layer={sourceLayer}
          paint={fillPaint}
        />
        {linePaint && (
          <Layer
            id={`select-layer-line-${id}`}
            type="line"
            source-layer={sourceLayer}
            paint={linePaint}
          />
        )}
        {concessionStyle && (
          <Layer
            id={`select-layer-hover-${id}`}
            type="fill"
            source-layer={sourceLayer}
            paint={selectAreaFillPaint}
          />
        )}
      </Source>
      {hoverInfo && <AreaTooltip hoverInfo={hoverInfo} />}
    </>
  );
}

export default VectorAreasLayer;
