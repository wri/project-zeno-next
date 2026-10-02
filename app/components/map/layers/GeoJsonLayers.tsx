import React from "react";
import { Source, Layer as MapLayer, Marker } from "react-map-gl/maplibre";
import { Flex, Tag } from "@chakra-ui/react";
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
import {
  aoiBboxLinePaint,
  aoiBoundaryColors,
  aoiCasingPaint,
  aoiLinePaint,
} from "./aoiStyle";
import AoiActionsMenu from "../AoiActionsMenu";
import type { AoiActionsTarget } from "../useAoiActions";
import {
  AOI_CHIP_GAP,
  AOI_LABEL_BG,
  AOI_LABEL_GAP,
  AOI_LABEL_HEIGHT,
  AOI_LABEL_PADDING,
  AOI_LABEL_RADIUS,
} from "../aoiLabelStyle";

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
  // The visible layer IS the scope — every rendered area layer is in-scope, so
  // it always uses the highlighted (in-context) styling. Removing the layer is
  // the only mutation; there is no select/deselect.
  const displayName = layer.selectionName ?? layer.name;
  const lineOpacity = !layer.visible ? 0 : 1;

  const isMultiArea = !!layer.selectionName;

  const { casingColor, mainLineColor } = aoiBoundaryColors(
    basemapTheme,
    isMultiArea
  );

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

  // Identity for the label's actions menu. The registry entry is the one place
  // that carries src id and subtype for both origins: a manual map click
  // (VectorAreasLayer) and an agent pick (pickAoiTool) both register it.
  const soleEntry = !isMultiArea && entries.length === 1 ? entries[0] : null;
  const actionsTarget: AoiActionsTarget | null = soleEntry
    ? {
        layerId: layer.id,
        areaName: soleEntry.ref.name,
        source: soleEntry.ref.source,
        srcId: soleEntry.srcId,
        subtype: soleEntry.subtype,
      }
    : null;
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
              paint={aoiCasingPaint(casingColor, lineOpacity)}
              filter={[
                "any",
                ["==", ["geometry-type"], "Polygon"],
                ["==", ["geometry-type"], "MultiPolygon"],
              ]}
            />
            <MapLayer
              id={lineLayerId}
              type="line"
              paint={aoiLinePaint(mainLineColor, lineOpacity)}
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
            paint={aoiBboxLinePaint(mainLineColor, lineOpacity)}
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
          {/* Two chips in a horizontal row, per the AOI menu design: the name
              label and the actions button are separate surfaces.
              The menu is attached to single-AOI labels only, since a dashboard
              is scoped to one AOI (POST /api/dashboards takes min 1, max 1)
              and the analysis actions take one area. */}
          <Flex align="center" gap={AOI_CHIP_GAP}>
            <Tag.Root
              colorPalette="primary"
              bg={AOI_LABEL_BG}
              color="white"
              h={AOI_LABEL_HEIGHT}
              px={AOI_LABEL_PADDING}
              gap={AOI_LABEL_GAP}
              rounded={AOI_LABEL_RADIUS}
              size="md"
              variant="solid"
            >
              <Tag.StartElement>
                {ChatContextOptions.area.icon}
              </Tag.StartElement>
              <Tag.Label fontWeight="medium">{displayName}</Tag.Label>
              <Tag.EndElement>
                {/* Full-strength white at rest: the close is a primary action
                    on the label, not a hover-revealed one. */}
                <Tag.CloseTrigger
                  color="white"
                  opacity={1}
                  cursor="pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  aria-label="Remove area"
                />
              </Tag.EndElement>
            </Tag.Root>
            {actionsTarget && <AoiActionsMenu target={actionsTarget} />}
          </Flex>
        </Marker>
      )}
    </>
  );
}
