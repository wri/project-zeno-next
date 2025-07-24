import React, { useEffect } from "react";
import {
  Source,
  Layer,
  Marker,
  useMap,
  MapMouseEvent,
} from "react-map-gl/maplibre";
import { Box, Text } from "@chakra-ui/react";
import { ChatContextOptions } from "./ContextButton";
import { Feature, Polygon, GeoJsonProperties, GeoJSON } from "geojson";
import { ContextItem } from "@/app/store/contextStore";
import bbox from "@turf/bbox";

interface MapFeatureProps {
  feature: {
    id: string;
    data: GeoJSON;
  };
  areas: ContextItem[];
  markerBg: string;
  markerBorderColor: string;
}

// Create a rectangle polygon from bbox coordinates
function createBboxPolygon(
  bboxCoords: [number, number, number, number]
): Feature<Polygon, GeoJsonProperties> {
  const [minLng, minLat, maxLng, maxLat] = bboxCoords;
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
          [minLng, minLat],
        ],
      ],
    },
  };
}

function MapFeature({
  feature,
  areas,
  markerBg,
  markerBorderColor,
}: MapFeatureProps) {
  const { current: map } = useMap();

  const fillColor = areas.find((a) => a.content === feature.id)
    ? "#3b82f6"
    : "#555";

  const sourceId = `geojson-source-${feature.id}`;
  const bboxSourceId = `bbox-source-${feature.id}`;
  const fillLayerId = `geojson-fill-${feature.id}`;
  const bboxLayerId = `bbox-line-${feature.id}`;

  // Calculate bounding box
  let bboxCoords: [number, number, number, number] | null = null;
  let bboxPolygon: Feature<Polygon, GeoJsonProperties> | null = null;

  try {
    bboxCoords = bbox(feature.data) as [number, number, number, number];
    bboxPolygon = createBboxPolygon(bboxCoords);
  } catch (error) {
    console.warn(`Failed to calculate bbox for feature ${feature.id}:`, error);
  }

  // Set up hover event listeners using featureState
  useEffect(() => {
    if (!map) return;

    let hoverId: string | number | undefined;

    const handleMouseEnter = (e: MapMouseEvent) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        if (hoverId !== undefined) {
          map.setFeatureState(
            { source: sourceId, id: hoverId },
            { hover: false }
          );
          // Also set state on bbox source
          map.setFeatureState(
            { source: bboxSourceId, id: hoverId },
            { hover: false }
          );
        }
        hoverId = feature.id || 0;
        map.setFeatureState({ source: sourceId, id: hoverId }, { hover: true });
        // Also set state on bbox source
        map.setFeatureState(
          { source: bboxSourceId, id: hoverId },
          { hover: true }
        );
      }
    };

    const handleMouseLeave = () => {
      if (hoverId !== undefined) {
        map.setFeatureState(
          { source: sourceId, id: hoverId },
          { hover: false }
        );
        // Also set state on bbox source
        map.setFeatureState(
          { source: bboxSourceId, id: hoverId },
          { hover: false }
        );
        hoverId = undefined;
      }
    };

    map.on("mouseenter", fillLayerId, handleMouseEnter);
    map.on("mouseleave", fillLayerId, handleMouseLeave);

    return () => {
      map.off("mouseenter", fillLayerId, handleMouseEnter);
      map.off("mouseleave", fillLayerId, handleMouseLeave);
    };
  }, [map, fillLayerId, sourceId, bboxSourceId]);

  // Get area context item for display
  const areaContext = areas.find((a) => a.content === feature.id);

  return (
    <>
      <Source
        id={sourceId}
        type="geojson"
        data={feature.data}
        generateId={true}
      >
        {/* Fill layer for polygons */}
        <Layer
          id={fillLayerId}
          type="fill"
          paint={{
            "fill-color": fillColor,
            "fill-opacity": 0.3,
          }}
          filter={["==", ["geometry-type"], "Polygon"]}
        />
      </Source>

      {/* Dashed rectangle around the feature */}
      {bboxPolygon && (
        <Source
          id={bboxSourceId}
          type="geojson"
          data={bboxPolygon}
          generateId={true}
        >
          {/* Dashed line layer (default) */}
          <Layer
            id={`${bboxLayerId}-dashed`}
            type="line"
            paint={{
              "line-color": fillColor,
              "line-width": 2,
              "line-dasharray": [2, 1],
              "line-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0, // Hide when hovered
                0.8, // Show when not hovered
              ],
            }}
          />
          {/* Solid line layer (on hover) */}
          <Layer
            id={`${bboxLayerId}-solid`}
            type="line"
            paint={{
              "line-color": fillColor,
              "line-width": 2,
              "line-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.8, // Show when hovered
                0, // Hide when not hovered
              ],
            }}
          />
        </Source>
      )}

      {/* Name marker at top-left corner */}
      {bboxCoords && (
        <Marker
          longitude={bboxCoords[0]}
          latitude={bboxCoords[3]}
          anchor="bottom-left"
        >
          <Box
            bg={markerBg}
            px={1}
            py={1}
            mb={1}
            borderColor={markerBorderColor}
            display="flex"
            alignItems="center"
            gap={1}
          >
            {areaContext ? (
              <>
                <Box color={fillColor}>{ChatContextOptions.area.icon}</Box>
                <Text fontSize="xs" fontWeight="medium" color={fillColor}>
                  {feature.id}
                </Text>
              </>
            ) : (
              <Text fontSize="xs" fontWeight="medium" color={fillColor}>
                {feature.id}
              </Text>
            )}
          </Box>
        </Marker>
      )}
    </>
  );
}

export default MapFeature;
