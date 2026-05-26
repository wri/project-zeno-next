"use client";

import { useMemo } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import MapGl, {
  Layer,
  Source,
  Marker,
  NavigationControl,
} from "react-map-gl/maplibre";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import { Box, Flex, Tag, Text } from "@chakra-ui/react";
import { MapPinIcon } from "@phosphor-icons/react";
import bbox from "@turf/bbox";
import type { PinnedAoi } from "@/app/types/portfolio";

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const BASEMAP_TILES = "devseed/cmazl5ws500bz01scaa27dqi4";

// Matches the main /app map's in-context single-area outline colour so the
// dashboard map block reads as the same kind of artefact.
const AOI_BBOX_COLOR = "#0A3785";

// Bbox rectangle as a single-feature FeatureCollection — what the bbox
// dashed line layer is sourced from.
function bboxToPolygon(
  b: [number, number, number, number]
): Feature<Polygon> {
  const [west, south, east, north] = b;
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  };
}

type Props = {
  aoi: PinnedAoi;
  height?: number | string;
  // When true, render the maplibre embed without the green wrapper +
  // title — used by MapBlock which provides its own chrome.
  bare?: boolean;
};

// Read-only maplibre embed. Mirrors the main /app map's AOI affordance —
// a dashed bbox rectangle plus a label tag anchored at the bbox's top-left
// corner — without rendering the polygon itself.
export default function MapCard({ aoi, height = 180, bare = false }: Props) {
  // Resolve a bbox to drive both the camera and the dashed rectangle.
  // Prefers the backend-provided bbox (handles antimeridian) and falls
  // back to a turf computation over the polygon snapshot.
  const bboxCoords: [number, number, number, number] | null = useMemo(() => {
    if (aoi.bbox) return aoi.bbox;
    if (!aoi.geometry) return null;
    try {
      return bbox(aoi.geometry) as [number, number, number, number];
    } catch {
      return null;
    }
  }, [aoi]);

  const bboxPolygon = useMemo<FeatureCollection | null>(
    () =>
      bboxCoords
        ? { type: "FeatureCollection", features: [bboxToPolygon(bboxCoords)] }
        : null,
    [bboxCoords]
  );

  const initialView = useMemo(() => {
    if (!bboxCoords) return { longitude: 0, latitude: 0, zoom: 1 };
    const [west, south, east, north] = bboxCoords;
    let eastUpdated = east;
    if (west > east) eastUpdated += 360;
    const lng = (west + eastUpdated) / 2;
    const lat = (south + north) / 2;
    return { longitude: lng, latitude: lat, zoom: 4 };
  }, [bboxCoords]);

  const heightStyle = typeof height === "number" ? `${height}px` : height;

  const inner = !bboxCoords ? (
    <Box
      rounded="sm"
      overflow="hidden"
      h={heightStyle}
      bg="bg.subtle"
      display="flex"
      alignItems="center"
      justifyContent="center"
      color="fg.muted"
      fontSize="xs"
    >
      No location data
    </Box>
  ) : (
    <Box rounded="sm" overflow="hidden" h={heightStyle}>
      <MapGl
        initialViewState={initialView}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <Source
          id="basemap"
          type="raster"
          tiles={[
            `https://api.mapbox.com/styles/v1/${BASEMAP_TILES}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`,
          ]}
        >
          <Layer id="basemap-tiles" type="raster" />
        </Source>
        {/* Dashed bbox outline matching the /app map's AOI affordance.
            Polygon geometry itself is intentionally hidden per UX
            direction; the bbox + label give location context without
            the full polygon overlay. */}
        {bboxPolygon && (
          <Source id="aoi-bbox" type="geojson" data={bboxPolygon}>
            <Layer
              id="aoi-bbox-line"
              type="line"
              paint={{
                "line-color": AOI_BBOX_COLOR,
                "line-width": 1.5,
                "line-dasharray": [2, 1],
                "line-opacity": 0.75,
              }}
            />
          </Source>
        )}
        {/* Label tag anchored at the top-left of the bbox — same
            placement as the main map. */}
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
            pointerEvents="none"
          >
            <Tag.Label fontWeight="medium">{aoi.name}</Tag.Label>
          </Tag.Root>
        </Marker>
        <NavigationControl position="top-right" showCompass={false} />
      </MapGl>
    </Box>
  );

  if (bare) return inner;

  return (
    <Box
      bg="green.subtle"
      border="1px solid"
      borderColor="green.muted"
      rounded="md"
      p={3}
    >
      <Flex align="center" gap={1.5} mb={1.5}>
        <MapPinIcon size={14} color="var(--chakra-colors-green-fg)" />
        <Text fontSize="xs" fontWeight="semibold" color="green.fg">
          {aoi.name}
        </Text>
      </Flex>
      {inner}
    </Box>
  );
}
