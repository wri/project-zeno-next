import React, { useState, useCallback, useEffect } from "react";
import { Source, Layer as MapLayer, Marker } from "react-map-gl/maplibre";
import { Tag } from "@chakra-ui/react";
import { ChatContextOptions } from "../../ContextButton";
import { Feature, FeatureCollection } from "geojson";
import useMapStore from "@/app/store/mapStore";
import {
  Layer as ManagedLayer,
  GeoJsonEntry,
  FeatureRef,
} from "@/app/store/layerManagerSlice";
import { BasemapTheme } from "../BasemapSelector";
import bbox from "@turf/bbox";
import { createBboxPolygon, unionAoiBboxes } from "@/app/utils/bboxUtils";

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
    [hoverTimeout]
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
        (e) => e.ref.name === ref.name && e.ref.source === ref.source
      )
    )
    .filter((e): e is GeoJsonEntry => !!e);
}

interface GeoJsonLayerGroupProps {
  layer: ManagedLayer;
  entries: GeoJsonEntry[];
  basemapTheme: BasemapTheme;
}

interface GeoJsonLayersProps {
  basemapTheme: BasemapTheme;
}

export default function GeoJsonLayers({ basemapTheme }: GeoJsonLayersProps) {
  const layers = useMapStore((s) => s.layers);
  const geoJsonRegistry = useMapStore((s) => s.geoJsonRegistry);
  const geoJsonLayers = layers.filter((l) => l.type === "geojson");

  return (
    <>
      {geoJsonLayers.map((layer) => {
        const entries = resolveFeatureRefs(
          layer.featureRefs ?? [],
          geoJsonRegistry
        );

        return (
          <GeoJsonLayerGroup
            key={layer.id}
            layer={layer}
            entries={entries}
            basemapTheme={basemapTheme}
          />
        );
      })}
    </>
  );
}

// If the group is a single area, render a single label and polygon
// If the group is a multi-area selection, render a bbox polygon and a label for the selection name
function GeoJsonLayerGroup({
  layer,
  entries,
  basemapTheme,
}: GeoJsonLayerGroupProps) {
  const removeLayer = useMapStore((s) => s.removeLayer);
  const { isHovered, setHoverState } = useHoverState();
  // The visible layer IS the scope — every rendered area layer is in-scope, so
  // it always uses the highlighted (in-context) styling. Removing the layer is
  // the only mutation; there is no select/deselect.
  const displayName = layer.selectionName ?? layer.name;
  const lineOpacity = !layer.visible ? 0 : 1;

  const isMultiArea = !!layer.selectionName;

  // On dark basemaps (dark, satellite) boundaries use white lines + blue casing
  // to maximise contrast. On light basemaps the colours are inverted.
  const casingColor = basemapTheme === "dark" ? "#172B7A" : "#FFFFFF";
  const mainLineColor =
    basemapTheme === "dark" ? "#FFFFFF" : isMultiArea ? "#8EA4E8" : "#172B7A";

  const handleRemove = () => removeLayer(layer.id);
  // Prefer backend-provided bbox (handles antimeridian); fall back to turf.
  const bboxCoords: [number, number, number, number] | null = (() => {
    const aois = layer.aoiSelection?.aois;
    if (aois && aois.length > 0) {
      // east may exceed 180 for antimeridian-crossing unions — createBboxPolygon
      // and MapLibre GeoJSON both handle coords > 180 natively.
      return unionAoiBboxes(aois);
    }
    return computeCombinedBbox(
      entries.map((e) => ({ id: e.ref.name, data: e.data }))
    );
  })();
  const bboxPolygon = bboxCoords ? createBboxPolygon(bboxCoords) : null;
  const groupId = layer.id.replace(/\s+/g, "-").toLowerCase();
  return (
    <>
      {/* Polygon outlines per feature */}
      {entries.map((entry) => {
        const sourceId = `geojson-source-${groupId}-${entry.ref.source}-${entry.ref.name}`;
        const fillLayerId = `geojson-fill-${groupId}-${entry.ref.source}-${entry.ref.name}`;
        const casingLayerId = `geojson-line-${groupId}-${entry.ref.source}-${entry.ref.name}-casing`;
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
              paint={{ "fill-color": mainLineColor, "fill-opacity": 0 }}
              filter={[
                "any",
                ["==", ["geometry-type"], "Polygon"],
                ["==", ["geometry-type"], "MultiPolygon"],
              ]}
            />
            {/* Casing layer (wider, contrasting colour) rendered below the main line */}
            <MapLayer
              id={casingLayerId}
              type="line"
              paint={{
                "line-color": casingColor,
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  3,
                  3.5,
                  6,
                  7,
                  10,
                  11,
                ],
                "line-opacity": lineOpacity,
              }}
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
                "line-color": mainLineColor,
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  3,
                  1,
                  6,
                  1.5,
                  10,
                  2,
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
          {/* In-scope area layers always show the solid bbox (no dashed
              "hover to select" affordance — visible already means in-scope). */}
          <MapLayer
            id={`bbox-line-${groupId}-dashed`}
            type="line"
            paint={{
              "line-color": mainLineColor,
              "line-width": 1.5,
              "line-dasharray": [2, 1],
              "line-opacity": 0,
            }}
          />
          <MapLayer
            id={`bbox-line-${groupId}-solid`}
            type="line"
            paint={{
              "line-color": mainLineColor,
              "line-width": 1.5,
              "line-opacity": 0.75 * lineOpacity,
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
            colorPalette="primary"
            px={2}
            py={1}
            size="md"
            variant="solid"
            roundedBottom="none"
            onMouseEnter={() => setHoverState(true)}
            onMouseLeave={() => setHoverState(false)}
          >
            <Tag.StartElement>{ChatContextOptions.area.icon}</Tag.StartElement>
            <Tag.Label fontWeight="medium">{displayName}</Tag.Label>
            <Tag.EndElement>
              <Tag.CloseTrigger
                opacity={isHovered ? 1 : 0.25}
                cursor="pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                  setHoverState(false);
                }}
                aria-label="Remove area"
              />
            </Tag.EndElement>
          </Tag.Root>
        </Marker>
      )}
    </>
  );
}
