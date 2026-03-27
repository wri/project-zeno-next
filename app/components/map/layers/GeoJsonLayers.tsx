import React, { useState, useCallback, useEffect } from "react";
import { Source, Layer as MapLayer, Marker } from "react-map-gl/maplibre";
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
import {
  Layer as ManagedLayer,
  GeoJsonEntry,
  FeatureRef,
} from "@/app/store/layerManagerSlice";
import bbox from "@turf/bbox";

// Create a rectangle polygon from bbox coordinates
function createBboxPolygon(
  bboxCoords: [number, number, number, number],
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
  features: { id: string; data: FeatureCollection | Feature }[],
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

// Hook to manage hover state for a feature
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
    [hoverTimeout],
  );
  useEffect(() => {
    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [hoverTimeout]);
  return { isHovered, setHoverState };
}

// Given a list of feature refs, resolve them to the corresponding geojson entries
function resolveFeatureRefs(refs: FeatureRef[], registry: GeoJsonEntry[]) {
  return refs
    .map((ref) =>
      registry.find(
        (e) => e.ref.name === ref.name && e.ref.source === ref.source,
      ),
    )
    .filter((e): e is GeoJsonEntry => !!e);
}

interface GeoJsonLayerGroupProps {
  layer: ManagedLayer;
  entries: GeoJsonEntry[];
  areas: ContextItem[];
}

interface GeoJsonLayersProps {
  areas: ContextItem[];
}

export default function GeoJsonLayers({ areas }: GeoJsonLayersProps) {
  const layers = useMapStore((s) => s.layers);
  const geoJsonRegistry = useMapStore((s) => s.geoJsonRegistry);
  const geoJsonLayers = layers.filter((l) => l.type === "geojson");

  return (
    <>
      {geoJsonLayers.map((layer) => {
        const entries = resolveFeatureRefs(
          layer.featureRefs ?? [],
          geoJsonRegistry,
        );
        return (
          <GeoJsonLayerGroup
            key={layer.id}
            layer={layer}
            entries={entries}
            areas={areas}
          />
        );
      })}
    </>
  );
}

// If the group is a single area, render a single label and polygon
// If the group is a multi-area selection, render a bbox polygon and a label for the selection name
function GeoJsonLayerGroup({ layer, entries, areas }: GeoJsonLayerGroupProps) {
  const { upsertContextByType, removeContext } = useContextStore();
  const { isHovered, setHoverState } = useHoverState();
  // Context matching — use layer.selectionName for groups, or first entry name for singles
  const displayName = layer.selectionName ?? layer.name;
  const areaInContext = areas.find((a) =>
    layer.selectionName
      ? a.aoiSelection?.name === layer.selectionName
      : a.content === layer.name || a.aoiData?.src_id === layer.name,
  );
  const isInContext = !!areaInContext;
  const lineOpacity = !layer.visible ? 0 : isInContext ? 1 : 0.5;

  const isMultiArea = !!layer.selectionName;
  const fillColor = isInContext
    ? isMultiArea
      ? "#8EA4E8"
      : "#0A3785"
    : "#666E7B";
  const handleRemoveFromContext = () => {
    if (areaInContext) removeContext(areaInContext.id);
  };
  const handleSelectFromLabel = () => {
    if (!isInContext) {
      if (layer.aoiSelection) {
        upsertContextByType({
          contextType: "area",
          content: displayName,
          aoiSelection: layer.aoiSelection,
        });
      } else {
        // For single-area layers, look up the registry entry to get the
        // correct src_id, source, and subtype for the context upsert.
        const ref = layer.featureRefs?.[0];
        const entry = ref
          ? entries.find(
              (e) => e.ref.name === ref.name && e.ref.source === ref.source,
            )
          : undefined;
        upsertContextByType({
          contextType: "area",
          content: displayName,
          aoiData: {
            src_id: entry?.srcId ?? layer.id,
            name: displayName,
            source: entry?.ref.source ?? "custom",
            subtype: entry?.subtype ?? "custom-area",
          },
        });
      }
    }
  };
  const bboxCoords = computeCombinedBbox(
    entries.map((e) => ({ id: e.ref.name, data: e.data })),
  );
  const bboxPolygon = bboxCoords ? createBboxPolygon(bboxCoords) : null;
  const groupId = layer.id.replace(/\s+/g, "-").toLowerCase();
  return (
    <>
      {/* Polygon outlines per feature */}
      {entries.map((entry) => {
        const sourceId = `geojson-source-${groupId}-${entry.ref.source}-${entry.ref.name}`;
        const fillLayerId = `geojson-fill-${groupId}-${entry.ref.source}-${entry.ref.name}`;
        const lineLayerId = `geojson-line-${groupId}-${entry.ref.source}-${entry.ref.name}-solid`;
        return (
          <Source
            key={sourceId}
            id={sourceId}
            type="geojson"
            data={entry.data}
            generateId={true}
          >
            <MapLayer
              id={fillLayerId}
              type="fill"
              paint={{ "fill-color": fillColor, "fill-opacity": 0 }}
              filter={[
                "any",
                ["==", ["geometry-type"], "Polygon"],
                ["==", ["geometry-type"], "MultiPolygon"],
              ]}
            />
            <MapLayer
              id={lineLayerId}
              type="line"
              paint={{
                "line-color": fillColor,
                "line-width": isMultiArea
                  ? 1.5
                  : [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      3,
                      0.5,
                      6,
                      1,
                      10,
                      2,
                      14,
                      3,
                    ],
                "line-opacity": lineOpacity,
              }}
              filter={[
                "any",
                ["==", ["geometry-type"], "Polygon"],
                ["==", ["geometry-type"], "MultiPolygon"],
              ]}
            />
          </Source>
        );
      })}
      {/* Combined bbox */}
      {bboxPolygon && (
        <Source
          id={`bbox-source-${groupId}`}
          type="geojson"
          data={bboxPolygon}
          generateId={true}
        >
          <MapLayer
            id={`bbox-line-${groupId}-dashed`}
            type="line"
            paint={{
              "line-color": fillColor,
              "line-width": 1.5,
              "line-dasharray": [2, 1],
              "line-opacity": isHovered || isInContext ? 0 : 0.75 * lineOpacity,
            }}
          />
          <MapLayer
            id={`bbox-line-${groupId}-solid`}
            type="line"
            paint={{
              "line-color": fillColor,
              "line-width": 1.5,
              "line-opacity": isHovered || isInContext ? 0.75 * lineOpacity : 0,
            }}
          />
        </Source>
      )}
      {/* Single label */}
      {bboxCoords && layer.visible && (
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
            onMouseEnter={() => setHoverState(true)}
            onMouseLeave={() => setHoverState(false)}
            onClick={handleSelectFromLabel}
          >
            {isInContext && (
              <Tag.StartElement>
                {ChatContextOptions.area.icon}
              </Tag.StartElement>
            )}
            <Tag.Label fontWeight="medium">{displayName}</Tag.Label>
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
