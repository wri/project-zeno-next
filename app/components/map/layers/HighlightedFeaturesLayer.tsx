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
import useMapStore from "@/app/store/mapStore";
import bbox from "@turf/bbox";

interface GeoJsonFeature {
  id: string;
  name?: string;
  selectionName?: string; // Used in multi-area selection
  data: FeatureCollection | Feature;
}

interface HighlightedFeaturesLayerProps {
  geoJsonFeatures: GeoJsonFeature[];
  areas: ContextItem[];
}

interface MapFeatureProps {
  feature: {
    id: string;
    selectionName?: string; // Used in multi-area selection
    data: FeatureCollection | Feature;
  };
  areas: ContextItem[];
}

/**
 * A group of features that are part of a multi-area selection.
 */
interface MapFeatureGroupProps {
  features: GeoJsonFeature[];
  areas: ContextItem[];
  selectionName: string; // Used in multi-area selection

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

// Compute the combined bbox of a list of features
function computeCombinedBbox(
  features: { id: string; data: FeatureCollection | Feature }[]
): [number, number, number, number] | null {
  let combinedBbox: [number, number, number, number] | null = null;
  for (const f of features) {
    try {
      const b = bbox(f.data) as [number, number, number, number];
      if (!combinedBbox) {
        combinedBbox = b;
      } else {
        combinedBbox = [
          Math.min(combinedBbox[0], b[0]),
          Math.min(combinedBbox[1], b[1]),
          Math.max(combinedBbox[2], b[2]),
          Math.max(combinedBbox[3], b[3]),
        ];
      }
    } catch {
      console.warn(`Failed to calculate bbox for feature ${f.id}`);
    }
  }
  return combinedBbox;
}

function useHoverState() {
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const setHoverState = useCallback(
    (hovered: boolean) => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        setHoverTimeout(null);
      }
      if (hovered) {
        setIsHovered(true);
      } else {
        const timeout = setTimeout(() => setIsHovered(false), 100);
        setHoverTimeout(timeout);
      }
    },
    [hoverTimeout]
  );
  useEffect(() => {
    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [hoverTimeout]);
  return { isHovered, setHoverState };
}

function MapFeature({ feature, areas }: MapFeatureProps) {
  const { upsertContextByType, removeContext } = useContextStore();
  const { isHovered, setHoverState } = useHoverState();

  const areaInContext = areas.find(
    // Match by direct content/aoiData, or by checking if this feature is
    // one of the AOIs in a multi-area selection (aoiSelection.aois)
    (a) =>
      a.content === feature.id ||
      a.aoiData?.src_id === feature.id
  );
  const isInContext = areaInContext ? true : false;

  const fillColor = isInContext ? "#0A3785" : "#666E7B";

  const sourceId = `geojson-source-${feature.id}`;
  const bboxSourceId = `bbox-source-${feature.id}`;
  const fillLayerId = `geojson-fill-${feature.id}`;
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


  const handleLabelMouseEnter = () => {
    setHoverState(true);
  };

  const handleLabelMouseLeave = () => {
    setHoverState(false);
  };

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
      <Source key={sourceId} id={sourceId} type="geojson" data={feature.data} generateId={true}>
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

        {/* Feature polygon outline */}
        <Layer
          id={lineSolidLayerId}
          type="line"
          paint={{
            "line-color": fillColor,
            "line-width": 2,
            "line-opacity": 1,
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
              "line-width": 1.5,
              "line-dasharray": [2, 1],
              "line-opacity": isHovered || isInContext ? 0 : 0.75,
            }}
          />
          {/* Solid line layer (on hover or in context) */}
          <Layer
            id={`${bboxLayerId}-solid`}
            type="line"
            paint={{
              "line-color": fillColor,
              "line-width": 1.5,
              "line-opacity": isHovered || isInContext ? 0.75 : 0,
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
            variant={isInContext ? "solid" : isHovered ? "surface" : "subtle"}
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

function MapFeatureGroup({ features, areas, selectionName }: MapFeatureGroupProps) {
  const aoiSelection = useMapStore((state) => state.aoiSelections[selectionName]);
  const { upsertContextByType, removeContext } = useContextStore();

  const areaInContext = areas.find(
    (a) => a.aoiSelection?.name === selectionName
  )
  const isInContext = !!areaInContext;
  const fillColor = isInContext ? "#0A3785" : "#666E7B";

  const { isHovered, setHoverState } = useHoverState();
  const handleRemoveFromContext = () => {
    if (areaInContext) {
      removeContext(areaInContext.id);
    }
  };

  const handleSelectFromLabel = () => {
    if (!isInContext) {
      upsertContextByType({
        contextType: "area",
        content: selectionName,
        aoiSelection,
      });
    }
  };

  if (!aoiSelection) { return null; }

  const bboxCoords = computeCombinedBbox(features);
  const bboxPolygon = bboxCoords ? createBboxPolygon(bboxCoords) : null;
  const groupId = selectionName.replace(/\s+/g, "-").toLowerCase();



  return (
    <>
    {features.map((feature) => {
      const sourceId = `geojson-source-${feature.id}`;
      const fillLayerId = `geojson-fill-${feature.id}`;
      const lineLayerId = `geojson-line-${feature.id}-solid`;
      return (
        <Source key={feature.id} id={sourceId} type="geojson" data={feature.data} generateId={true}>
          <Layer id={fillLayerId} type="fill"
            paint={{ "fill-color": fillColor, "fill-opacity": 0 }}
            filter={["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]]}
          />
          <Layer id={lineLayerId} type="line"
            paint={{ "line-color": fillColor, "line-width": 2, "line-opacity": 1 }}
            filter={["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]]}
          />
        </Source>
      );
    })}
    {bboxPolygon && (
      <Source id={`bbox-source-${groupId}`} type="geojson" data={bboxPolygon} generateId={true}>
        <Layer id={`bbox-line-${groupId}-dashed`} type="line"
          paint={{
            "line-color": fillColor, "line-width": 1.5,
            "line-dasharray": [2, 1],
            "line-opacity": isHovered || isInContext ? 0 : 0.75,
          }}
        />
        <Layer id={`bbox-line-${groupId}-solid`} type="line"
          paint={{
            "line-color": fillColor, "line-width": 1.5,
            "line-opacity": isHovered || isInContext ? 0.75 : 0,
          }}
        />
      </Source>
    )}
    {bboxCoords && (
      <Marker longitude={bboxCoords[0]} latitude={bboxCoords[3]} anchor="bottom-left">
        <Tag.Root
          colorPalette={isInContext ? "primary" : "gray"}
          px={2} py={1} size="md"
          variant={isInContext ? "solid" : isHovered ? "surface" : "subtle"}
          roundedBottom="none" cursor="pointer"
          onMouseEnter={() => setHoverState(true)}
          onMouseLeave={() => setHoverState(false)}
          onClick={handleSelectFromLabel}
        >
          {isInContext && <Tag.StartElement>{ChatContextOptions.area.icon}</Tag.StartElement>}
          <Tag.Label fontWeight="medium">{selectionName}</Tag.Label>
          {isInContext && (
            <Tag.EndElement>
              <Tag.CloseTrigger
                opacity={isHovered ? 1 : 0.25} cursor="pointer"
                onClick={(e) => { e.stopPropagation(); handleRemoveFromContext(); setHoverState(false); }}
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
}) => {
  const ungroupedFeatures = geoJsonFeatures.filter((f) => !f.selectionName);

  const groups = new Map<string, GeoJsonFeature[]>();
  geoJsonFeatures
    .filter((f) => f.selectionName)
    .forEach((f) => {
      const key = f.selectionName!;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    });

  return (
    <>
      {ungroupedFeatures.map((feature) => (
        <MapFeature key={feature.id} feature={feature} areas={areas} />
      ))}
      {Array.from(groups.entries()).map(([selectionName, features]) => (
        <MapFeatureGroup
          key={selectionName}
          selectionName={selectionName}
          features={features}
          areas={areas}
        />
      ))}
    </>
  );
};

export default HighlightedFeaturesLayer;
