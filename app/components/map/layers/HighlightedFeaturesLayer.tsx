import React, { useEffect, useState, useCallback, FC } from "react";
import { Source, Layer, Marker } from "react-map-gl/maplibre";
import { Tag } from "@chakra-ui/react";
import { ChatContextOptions } from "../../ContextButton";
import {
  Feature,
  FeatureCollection,
  Polygon,
  GeoJsonProperties,
} from "geojson";
import useContextStore, { ContextItem } from "@/app/store/contextStore";
import bbox from "@turf/bbox";

interface GeoJsonFeature {
  id: string;
  name?: string;
  data: FeatureCollection | Feature;
}

interface HighlightedFeaturesLayerProps {
  geoJsonFeatures: GeoJsonFeature[];
  areas: ContextItem[];
}

interface MapFeatureProps {
  feature: {
    id: string;
    data: FeatureCollection | Feature;
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

function MapFeature({ feature, areas }: MapFeatureProps) {
  const { upsertContextByType, removeContext } = useContextStore();
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const areaInContext = areas.find(
    // Not ideal way of matching areas, we should normalize area ids
    (a) => a.content === feature.id || a.aoiData?.src_id === feature.id
  );
  const isInContext = areaInContext ? true : false;

  const fillColor = isInContext ? "#3b82f6" : "#555";

  const sourceId = `geojson-source-${feature.id}`;
  const bboxSourceId = `bbox-source-${feature.id}`;
  const fillLayerId = `geojson-fill-${feature.id}`;
  const lineDashedLayerId = `geojson-line-${feature.id}-dashed`;
  const lineSolidLayerId = `geojson-line-${feature.id}-solid`;
  const bboxLayerId = `bbox-line-${feature.id}`;

  let bboxCoords: [number, number, number, number] | null = null;
  let bboxPolygon: Feature<Polygon, GeoJsonProperties> | null = null;

  const featureName = (feature.data as Feature).properties?.name || feature.id;

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

  // Clear hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  const handleRemoveFromContext = () => {
    if (areaInContext) {
      removeContext(areaInContext.id);
    }
  };

  const handleSelectFromLabel = () => {
    if (!isInContext) {
      upsertContextByType({
        contextType: "area",
        content: featureName,
        aoiData: {
          src_id: feature.id,
          name: featureName,
          source: "custom",
          subtype: "custom-area",
        },
      });
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
        {/* Fill layer for polygons (transparent fill only) */}
        <Layer
          id={fillLayerId}
          type="fill"
          paint={{
            "fill-color": fillColor,
            "fill-opacity": 0,
          }}
          filter={[
            "any",
            ["==", ["geometry-type"], "Polygon"],
            ["==", ["geometry-type"], "MultiPolygon"],
          ]}
        />

        {/* Dashed polygon outline (default when not hovered and not selected) */}
        <Layer
          id={lineDashedLayerId}
          type="line"
          paint={{
            "line-color": fillColor,
            "line-width": 2,
            "line-dasharray": [2, 1],
            "line-opacity": isHovered || isInContext ? 0 : 1,
          }}
          filter={[
            "any",
            ["==", ["geometry-type"], "Polygon"],
            ["==", ["geometry-type"], "MultiPolygon"],
          ]}
        />

        {/* Solid polygon outline (on hover or when selected) */}
        <Layer
          id={lineSolidLayerId}
          type="line"
          paint={{
            "line-color": fillColor,
            "line-width": 2,
            "line-opacity": isHovered || isInContext ? 1 : 0,
          }}
          filter={[
            "any",
            ["==", ["geometry-type"], "Polygon"],
            ["==", ["geometry-type"], "MultiPolygon"],
          ]}
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
              "line-opacity": isHovered || isInContext ? 0 : 0.8,
            }}
          />
          {/* Solid line layer (on hover) */}
          <Layer
            id={`${bboxLayerId}-solid`}
            type="line"
            paint={{
              "line-color": fillColor,
              "line-width": 2,
              "line-opacity": isHovered || isInContext ? 0.8 : 0,
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
            colorPalette={isInContext ? "primary" : "gray"}
            px={2}
            py={1}
            size="md"
            variant={isHovered ? "surface" : "subtle"}
            roundedBottom="none"
            cursor="pointer"
            onMouseEnter={handleLabelMouseEnter}
            onMouseLeave={handleLabelMouseLeave}
            onClick={handleSelectFromLabel}
          >
            {isInContext && (
              <Tag.StartElement>
                {ChatContextOptions.area.icon}
              </Tag.StartElement>
            )}
            <Tag.Label fontWeight="medium">{featureName}</Tag.Label>
            {/* Show X button on hover if in context */}
            {isInContext && (
              <Tag.EndElement>
                <Tag.CloseTrigger
                  opacity={isHovered ? 1 : 0.25}
                  cursor="pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromContext();
                    setHoverState(false);
                  }}
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

const HighlightedFeaturesLayer: FC<HighlightedFeaturesLayerProps> = ({
  geoJsonFeatures,
  areas,
}: HighlightedFeaturesLayerProps) => {
  return (
    <>
      {geoJsonFeatures.map((feature) => (
        <MapFeature key={feature.id} feature={feature} areas={areas} />
      ))}
    </>
  );
};

export default HighlightedFeaturesLayer;
