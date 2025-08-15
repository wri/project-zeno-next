import React, { useEffect, useState, useCallback } from "react";
import {
  Source,
  Layer,
  Marker,
  useMap,
  MapMouseEvent,
} from "react-map-gl/maplibre";
import { Tag } from "@chakra-ui/react";
import { ChatContextOptions } from "./ContextButton";
import { Feature, Polygon, GeoJsonProperties, GeoJSON } from "geojson";
import useContextStore, { ContextItem } from "@/app/store/contextStore";
import bbox from "@turf/bbox";

interface MapFeatureProps {
  feature: {
    id: string;
    data: GeoJSON;
  };
  areas: ContextItem[];
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
}: MapFeatureProps) {
  const { current: map } = useMap();
  const { addContext, removeContext } = useContextStore();
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

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

  const setHoverState = useCallback(
    (hovered: boolean) => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        setHoverTimeout(null);
      }

      if (hovered) {
        setIsHovered(true);
      } else {
        // Add small delay before hiding to allow moving between polygon and label
        const timeout = setTimeout(() => {
          setIsHovered(false);
        }, 100);
        setHoverTimeout(timeout);
      }
    },
    [hoverTimeout]
  );

  const handleLabelMouseEnter = () => {
    setHoverState(true);
  };

  const handleLabelMouseLeave = () => {
    setHoverState(false);
  };

  // Set up hover and click event listeners
  useEffect(() => {
    if (!map) return;

    let hoverId: string | number | undefined;

    // Helper function to set feature hover state on both sources
    const setFeatureHoverState = (id: string | number, hovered: boolean) => {
      map.setFeatureState({ source: sourceId, id }, { hover: hovered });
      map.setFeatureState({ source: bboxSourceId, id }, { hover: hovered });
    };

    // Helper function to clear all hover states
    const clearHoverState = () => {
      if (hoverId !== undefined) {
        setFeatureHoverState(hoverId, false);
        hoverId = undefined;
      }
      setHoverState(false);
    };

    const handleMouseEnter = (e: MapMouseEvent) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];

        // Clear previous hover if exists
        if (hoverId !== undefined) {
          setFeatureHoverState(hoverId, false);
        }

        // Set new hover
        hoverId = feature.id || 0;
        setFeatureHoverState(hoverId, true);
        setHoverState(true);
      }
    };

    const handleMouseLeave = () => {
      clearHoverState();
    };

    const handleClick = () => {
      // Only add to context if not already in context
      const isInContext = areas.find((a) => a.content === feature.id);
      if (!isInContext) {
        addContext({
          contextType: "area",
          content: feature.id,
        });
      }
    };

    // Reset hover state on map zoom/move to prevent stuck states
    const handleMapTransform = () => {
      clearHoverState();
    };

    map.on("mouseenter", fillLayerId, handleMouseEnter);
    map.on("mouseleave", fillLayerId, handleMouseLeave);
    map.on("click", fillLayerId, handleClick);
    map.on("zoom", handleMapTransform);
    map.on("move", handleMapTransform);

    return () => {
      map.off("mouseenter", fillLayerId, handleMouseEnter);
      map.off("mouseleave", fillLayerId, handleMouseLeave);
      map.off("click", fillLayerId, handleClick);
      map.off("zoom", handleMapTransform);
      map.off("move", handleMapTransform);
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [
    map,
    fillLayerId,
    sourceId,
    bboxSourceId,
    feature.id,
    areas,
    addContext,
    hoverTimeout,
    setHoverState,
  ]);

  // Get area context item for display
  const areaContext = areas.find((a) => a.content === feature.id);

  const handleRemoveFromContext = () => {
    if (areaContext) {
      removeContext(areaContext.id);
    }
  };

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
          <Tag.Root
            colorPalette={areaContext ? "primary" : "gray"}
            px={2}
            py={1}
            size="md"
            variant={isHovered ? "surface" : "subtle"}
            roundedBottom="none"
            onMouseEnter={handleLabelMouseEnter}
            onMouseLeave={handleLabelMouseLeave}
          >
            {areaContext && (
              <Tag.StartElement>
                {ChatContextOptions.area.icon}
              </Tag.StartElement>
            )}
            <Tag.Label fontWeight="medium">{feature.id}</Tag.Label>
            {/* Show X button on hover if in context */}
            {areaContext && (
              <Tag.EndElement>
                <Tag.CloseTrigger
                  opacity={isHovered ? 1 : 0.25}
                  cursor="pointer"
                  onClick={handleRemoveFromContext}
                  aria-label="Remove from context"
                />
              </Tag.EndElement>
            )}
          </Tag.Root>
        </Marker>
      )}
    </>
  );
}

export default MapFeature;
