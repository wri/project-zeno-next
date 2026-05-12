"use client";

import { useMemo } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import MapGl, { Layer, Source } from "react-map-gl/maplibre";
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

function PlaceholderSvg() {
  return (
    <svg
      viewBox="0 0 160 64"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", borderRadius: "4px" }}
      aria-hidden
    >
      <rect width="160" height="64" fill="#dceee4" rx="3" />
      <polygon
        points="22,52 38,18 62,12 90,24 118,14 138,40 122,56 72,60 34,58"
        fill="#8cc4a4"
        opacity="0.7"
        stroke="#4a9a6a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="78" cy="36" r="4" fill="#2a8a50" />
    </svg>
  );
}

// Read-only maplibre embed rendering the AOI polygon. Falls back to a
// stylised SVG when the geometry snapshot is missing.
export default function MapCard({ aoi, height = 180, bare = false }: Props) {
  const initialView = useMemo(() => {
    const b = aoi.geometry ? bbox(aoi.geometry) : aoi.bbox;
    if (!b) return { longitude: 0, latitude: 0, zoom: 1 };
    const [west, south, east, north] = b as [number, number, number, number];
    let eastUpdated = east;
    if (west > east) eastUpdated += 360;
    const lng = (west + eastUpdated) / 2;
    const lat = (south + north) / 2;
    return { longitude: lng, latitude: lat, zoom: 4 };
  }, [aoi]);

  const heightStyle = typeof height === "number" ? `${height}px` : height;

  // Inner map / placeholder, no chrome.
  const inner = !aoi.geometry ? (
    <Box rounded="sm" overflow="hidden" h={heightStyle}>
      <PlaceholderSvg />
    </Box>
  ) : (
    <Box rounded="sm" overflow="hidden" h={heightStyle}>
      <MapGl
        initialViewState={initialView}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        interactive={false}
        dragPan={false}
        scrollZoom={false}
        doubleClickZoom={false}
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
        <Source id="aoi" type="geojson" data={aoi.geometry}>
          <Layer
            id="aoi-fill"
            type="fill"
            paint={{
              "fill-color": "#2a8a50",
              "fill-opacity": 0.3,
            }}
          />
          <Layer
            id="aoi-line"
            type="line"
            paint={{
              "line-color": "#2a8a50",
              "line-width": 1.8,
            }}
          />
        </Source>
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
