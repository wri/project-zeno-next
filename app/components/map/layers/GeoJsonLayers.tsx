import React, { useState, useCallback, useEffect } from "react";
import {
  Source,
  Layer as MapLayer,
  Marker,
  useMap,
} from "react-map-gl/maplibre";
import { Box, Flex, Text } from "@chakra-ui/react";
import { XIcon } from "@phosphor-icons/react";
import AoiActionsMenu from "@/app/dashboards/components/AoiActionsMenu";
import { useAnalysis, type AreaSelection } from "@/src/features/analysis";
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
import { BasemapTheme } from "../BasemapSelector";
import bbox from "@turf/bbox";
import { unionAoiBboxes } from "@/app/utils/bboxUtils";

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
  areas: ContextItem[];
  basemapTheme: BasemapTheme;
}

interface GeoJsonLayersProps {
  areas: ContextItem[];
  basemapTheme: BasemapTheme;
}

export default function GeoJsonLayers({
  areas,
  basemapTheme,
}: GeoJsonLayersProps) {
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
            areas={areas}
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
  areas,
  basemapTheme,
}: GeoJsonLayerGroupProps) {
  const { addContext, removeContext } = useContextStore();
  const { isHovered, setHoverState } = useHoverState();
  const { current: map } = useMap();
  // Context matching — use layer.selectionName for groups, or first entry name for singles
  const displayName = layer.selectionName ?? layer.name;
  const areaInContext = areas.find((a) =>
    layer.selectionName
      ? a.aoiSelection?.name === layer.selectionName
      : a.content === layer.name || a.aoiData?.src_id === layer.name
  );
  const isInContext = !!areaInContext;
  const lineOpacity = !layer.visible ? 0 : isInContext ? 1 : 0.5;

  const isMultiArea = !!layer.selectionName;

  // On dark basemaps (dark, satellite) boundaries use white lines + blue casing
  // to maximise contrast. On light basemaps the colours are inverted.
  const casingColor = basemapTheme === "dark" ? "#172B7A" : "#FFFFFF";
  const mainLineColor = isInContext
    ? basemapTheme === "dark"
      ? "#FFFFFF"
      : isMultiArea
        ? "#8EA4E8"
        : "#172B7A"
    : "#666E7B";

  const handleRemoveFromContext = () => {
    if (areaInContext) removeContext(areaInContext.id);
  };
  const handleSelectFromLabel = () => {
    if (!isInContext) {
      // Areas stack — addContext keeps existing area chips and adds a new one.
      // The `isInContext` guard above already prevents re-adding the same layer.
      if (layer.aoiSelection) {
        addContext({
          contextType: "area",
          content: displayName,
          aoiSelection: layer.aoiSelection,
        });
      } else {
        // For single-area layers, look up the registry entry to get the
        // correct src_id, source, and subtype for the context entry.
        const ref = layer.featureRefs?.[0];
        const entry = ref
          ? entries.find(
              (e) => e.ref.name === ref.name && e.ref.source === ref.source
            )
          : undefined;
        addContext({
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

  // Default analysis (ported from feat/analysis-enhancements-PZB-957): build the
  // area to analyse from the selection (first AOI for multi-area), run the
  // default TCL analysis on demand, and surface results in the InsightWorkspace.
  const { status: analysisStatus, run: runAnalysis } = useAnalysis();
  const analysisArea: AreaSelection | null = (() => {
    const aois = layer.aoiSelection?.aois;
    if (aois && aois.length > 0) {
      const a = aois[0];
      return {
        name: a.name,
        source: a.source,
        srcId: a.src_id,
        subtype: a.subtype,
      };
    }
    const ref = layer.featureRefs?.[0];
    const entry = ref
      ? entries.find(
          (e) => e.ref.name === ref.name && e.ref.source === ref.source
        )
      : undefined;
    if (entry) {
      return {
        name: displayName,
        source: entry.ref.source,
        srcId: entry.srcId,
        subtype: entry.subtype,
      };
    }
    return null;
  })();
  const viewAnalysis = () => {
    if (!analysisArea) return;
    runAnalysis({
      area: analysisArea,
      dataset: { id: 4 }, // Tree cover loss — the default analysis
      startDate: "2001-01-01",
      endDate: "2025-12-31",
    });
  };

  // Anchor the "…" dropdown to the bbox's top-left corner (inset by a small
  // gap) rather than to the trigger, so the menu opens just inside the box.
  const GAP = 8;
  const menuAnchorRect = () => {
    if (!map || !bboxCoords) return null;
    const p = map.project([bboxCoords[0], bboxCoords[3]]);
    const rect = map.getContainer().getBoundingClientRect();
    return {
      x: rect.left + p.x + GAP,
      y: rect.top + p.y + GAP,
      width: 0,
      height: 0,
    };
  };

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
          <MapLayer
            id={`bbox-line-${groupId}-dashed`}
            type="line"
            paint={{
              "line-color": mainLineColor,
              "line-width": 1.5,
              "line-dasharray": [2, 1],
              "line-opacity": isHovered || isInContext ? 0 : 0.75 * lineOpacity,
            }}
          />
          <MapLayer
            id={`bbox-line-${groupId}-solid`}
            type="line"
            paint={{
              "line-color": mainLineColor,
              "line-width": 1.5,
              "line-opacity": isHovered || isInContext ? 0.75 * lineOpacity : 0,
            }}
          />
        </Source>
      )}
      {/* AOI label: a chip (name + ×) and a separate "…" actions button,
          sitting on top of the bbox's top-left corner. */}
      {bboxCoords && layer.visible && (
        <Marker
          longitude={bboxCoords[0]}
          latitude={bboxCoords[3]}
          anchor="bottom-left"
        >
          <Flex
            align="center"
            gap={2}
            onMouseEnter={() => setHoverState(true)}
            onMouseLeave={() => setHoverState(false)}
          >
            {/* Label chip — solid blue when selected, with the × beside the name */}
            <Flex
              align="center"
              gap={1.5}
              h="24px"
              px={2}
              rounded="md"
              boxShadow="sm"
              cursor="pointer"
              bg={isInContext ? "#21509A" : "rgba(255,255,255,0.92)"}
              color={isInContext ? "#FFFFFF" : "#3A4048"}
              borderWidth={isInContext ? "0" : "1px"}
              borderColor="rgba(19,22,25,0.12)"
              _hover={{ bg: isInContext ? "#1B4382" : "#FFFFFF" }}
              onClick={handleSelectFromLabel}
            >
              {isInContext && (
                <Box as="span" display="inline-flex" fontSize="12px">
                  {ChatContextOptions.area.icon}
                </Box>
              )}
              <Text fontSize="12px" fontWeight="medium" lineHeight="1">
                {displayName}
              </Text>
              {isInContext && (
                <Box
                  as="span"
                  role="button"
                  aria-label="Remove from context"
                  display="inline-flex"
                  cursor="pointer"
                  opacity={0.85}
                  _hover={{ opacity: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromContext();
                    setHoverState(false);
                  }}
                >
                  <XIcon size={13} weight="bold" />
                </Box>
              )}
            </Flex>

            {/* Separate "…" actions button (Create dashboard, View analysis, …) */}
            <Box onClick={(e) => e.stopPropagation()}>
              <AoiActionsMenu
                name={displayName}
                isActive={isInContext}
                analyzing={analysisStatus === "running"}
                onViewAnalysis={analysisArea ? viewAnalysis : undefined}
                getAnchorRect={menuAnchorRect}
              />
            </Box>
          </Flex>
        </Marker>
      )}
    </>
  );
}
