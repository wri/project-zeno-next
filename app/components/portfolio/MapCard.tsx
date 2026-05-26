"use client";

import { useMemo } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import MapGl, {
  Layer,
  Source,
  NavigationControl,
} from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";
import { Box, Flex, Text } from "@chakra-ui/react";
import { MapPinIcon } from "@phosphor-icons/react";
import bbox from "@turf/bbox";
import type { PinnedAoi } from "@/app/types/portfolio";

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const BASEMAP_TILES = "devseed/cmazl5ws500bz01scaa27dqi4";

type Props = {
  aoi: PinnedAoi;
  height?: number | string;
  // When true, render the maplibre embed without the green wrapper +
  // title — used by MapBlock which provides its own chrome.
  bare?: boolean;
};

// Build a rectangular FeatureCollection from a bbox so AOIs that lack a
// real polygon snapshot (e.g. the seed insights, or pins where the
// geoJsonRegistry was empty) still render on a basemap.
function bboxToFeatureCollection(
  b: [number, number, number, number]
): FeatureCollection {
  const [west, south, east, north] = b;
  return {
    type: "FeatureCollection",
    features: [
      {
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
      },
    ],
  };
}

// Read-only maplibre embed rendering the AOI polygon. Synthesises a
// rectangle from bbox when no real polygon is available so we always
// show a real basemap.
export default function MapCard({ aoi, height = 180, bare = false }: Props) {
  // Prefer the real polygon snapshot; otherwise approximate with a
  // bbox rectangle. The result is always a FeatureCollection or
  // undefined (only when we have neither).
  const geometry: FeatureCollection | undefined = useMemo(() => {
    if (aoi.geometry) return aoi.geometry;
    if (aoi.bbox) return bboxToFeatureCollection(aoi.bbox);
    return undefined;
  }, [aoi]);

  const initialView = useMemo(() => {
    const b = geometry ? bbox(geometry) : undefined;
    if (!b) return { longitude: 0, latitude: 0, zoom: 1 };
    const [west, south, east, north] = b as [number, number, number, number];
    let eastUpdated = east;
    if (west > east) eastUpdated += 360;
    const lng = (west + eastUpdated) / 2;
    const lat = (south + north) / 2;
    return { longitude: lng, latitude: lat, zoom: 4 };
  }, [geometry]);

  const heightStyle = typeof height === "number" ? `${height}px` : height;

  const inner = !geometry ? (
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
        {/* AOI fill/line layers intentionally omitted — the map still
            centers on the AOI's bbox but the polygon overlay is hidden
            for now per UX direction. Re-add the <Source id="aoi"> block
            when geometry display is wanted again. */}
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
