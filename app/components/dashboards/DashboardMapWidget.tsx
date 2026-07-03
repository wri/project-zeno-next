"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect } from "react";
import MapGl, { Layer, Source } from "react-map-gl/maplibre";
import { useQuery } from "@tanstack/react-query";
import turfBbox from "@turf/bbox";
import { Box, Flex, Heading, Spinner, Text } from "@chakra-ui/react";
import { MapTrifoldIcon } from "@phosphor-icons/react";
import { buildBasemapTileUrl } from "@/app/utils/basemapTileUrl";
import { fetchGeometry } from "@/app/utils/geometryClient";
import { registerPrimaryForestProtocol } from "@/app/utils/primaryForestTileProtocol";
import type { MapWidgetSpec } from "@/app/lib/dashboard-widgets";
import type { DashboardAoi } from "@/app/schemas/api/dashboards/get";

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
// Same default basemap style as the explorer map (Map.tsx).
const BASEMAP_STYLE = "devseed/cmazl5ws500bz01scaa27dqi4";
const AOI_LINE_COLOR = "#172B7A";

interface TileJson {
  minzoom?: number;
  maxzoom?: number;
  bounds?: [number, number, number, number];
}

interface DashboardMapWidgetProps {
  spec: MapWidgetSpec;
  /** The dashboard's area — the map fits its viewport to it (single-area MVP). */
  aoi?: DashboardAoi;
}

export default function DashboardMapWidget({
  spec,
  aoi,
}: DashboardMapWidgetProps) {
  useEffect(() => {
    registerPrimaryForestProtocol();
  }, []);

  // Shared across widgets on the same dashboard via the query cache.
  const { data: geometryResponse, isLoading } = useQuery({
    queryKey: ["geometry", aoi?.source, aoi?.src_id],
    queryFn: () => fetchGeometry(aoi!.source, aoi!.src_id),
    enabled: !!aoi,
    staleTime: Infinity,
    retry: false,
  });

  // Imagery mosaics only have tiles inside their own area/zoom range, and the
  // tile service 500s (without CORS headers) on anything outside it. Fetch the
  // mosaic's tilejson and constrain the source so those tiles are never
  // requested. Best-effort: on fetch failure the source renders unconstrained.
  const tilejsonQuery = useQuery({
    queryKey: ["tilejson", spec.tilejsonUrl],
    queryFn: async (): Promise<TileJson> => {
      const res = await fetch(spec.tilejsonUrl!);
      if (!res.ok) throw new Error(`Failed to fetch tilejson: ${res.status}`);
      return res.json();
    },
    enabled: !!spec.tilejsonUrl,
    staleTime: Infinity,
    retry: false,
  });
  const tilejson = tilejsonQuery.data;
  const tileConstraints = {
    ...(typeof tilejson?.minzoom === "number"
      ? { minzoom: tilejson.minzoom }
      : {}),
    ...(typeof tilejson?.maxzoom === "number"
      ? { maxzoom: tilejson.maxzoom }
      : {}),
    ...(Array.isArray(tilejson?.bounds) && tilejson.bounds.length === 4
      ? { bounds: tilejson.bounds }
      : {}),
  };
  const isFetching =
    (!!aoi && isLoading) || (!!spec.tilejsonUrl && tilejsonQuery.isLoading);

  const geometry = geometryResponse?.geometry;
  const bounds = geometry
    ? (turfBbox(geometry) as [number, number, number, number])
    : undefined;

  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor="border.emphasized"
      overflow="hidden"
      bg="bg"
    >
      <Flex px={4} py={3} gap={2} align="center">
        <MapTrifoldIcon size={16} />
        <Heading size="xs" fontWeight="medium" m={0} lineClamp={1}>
          {spec.title}
        </Heading>
        {spec.caption && (
          <Text fontSize="xs" color="fg.muted" ml="auto" mr={7} lineClamp={1}>
            {spec.caption}
          </Text>
        )}
      </Flex>
      <Box h="320px" position="relative" bg="neutral.200">
        {isFetching ? (
          <Flex h="100%" align="center" justify="center">
            <Spinner />
          </Flex>
        ) : (
          <MapGl
            style={{ width: "100%", height: "100%" }}
            initialViewState={
              bounds
                ? { bounds, fitBoundsOptions: { padding: 24 } }
                : { longitude: 0, latitude: 10, zoom: 1 }
            }
            attributionControl={false}
            cooperativeGestures
          >
            <Source
              id="basemap"
              type="raster"
              tiles={[
                buildBasemapTileUrl(
                  BASEMAP_STYLE,
                  MAPBOX_ACCESS_TOKEN,
                  typeof window === "undefined" ? 1 : window.devicePixelRatio
                ),
              ]}
            >
              <Layer id="basemap-tiles" type="raster" />
            </Source>
            {spec.tileUrls.map((tileUrl, i) => (
              <Source
                key={tileUrl}
                id={`widget-tiles-${i}`}
                type="raster"
                tiles={[tileUrl]}
                tileSize={256}
                {...tileConstraints}
              >
                <Layer
                  id={`widget-tiles-layer-${i}`}
                  type="raster"
                  paint={{
                    "raster-opacity": spec.kind === "imagery" ? 1 : 0.8,
                  }}
                />
              </Source>
            ))}
            {geometry && (
              <Source id="widget-aoi" type="geojson" data={geometry}>
                <Layer
                  id="widget-aoi-line"
                  type="line"
                  paint={{
                    "line-color": AOI_LINE_COLOR,
                    "line-width": 1.5,
                  }}
                />
              </Source>
            )}
          </MapGl>
        )}
      </Box>
    </Box>
  );
}
