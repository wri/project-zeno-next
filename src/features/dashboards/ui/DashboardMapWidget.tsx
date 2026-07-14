"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Tag } from "@chakra-ui/react";
import { PolygonIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import turfBbox from "@turf/bbox";
import MapGl, {
  AttributionControl,
  Layer,
  Marker,
  NavigationControl,
  Source,
  type MapRef,
} from "react-map-gl/maplibre";

import {
  aoiBboxLinePaint,
  aoiBoundaryColors,
  aoiCasingPaint,
  aoiLinePaint,
} from "@/app/components/map/layers/aoiStyle";
import { buildBasemapTileUrl } from "@/app/utils/basemapTileUrl";
import { createBboxPolygon } from "@/app/utils/bboxUtils";
import { fetchGeometry } from "@/app/utils/geometryClient";
import { registerPrimaryForestProtocol } from "@/app/utils/primaryForestTileProtocol";
import type { MapWidgetLayer } from "../lib/mapWidgets";
import DashboardMapLegend, {
  type MapWidgetOpacity,
} from "./DashboardMapLegend";

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
// The explorer's default light basemap style.
const BASEMAP_STYLE = "devseed/cmazl5ws500bz01scaa27dqi4";
// The widget basemap is always light, and dashboards are single-area.
const AOI_COLORS = aoiBoundaryColors("light");

/**
 * The map body of a `widget_type: "map"` dashboard card. Self-contained per
 * the handoff: renders the config's resolved `tile_url` directly (context
 * sub-layer beneath it), outlines the dashboard's area, and fits the
 * viewport to that area — or to the reserved `config.viewport` bbox
 * override, which wins when present.
 */
export default function DashboardMapWidget({
  layer,
  aoi,
  bboxOverride,
  tall,
}: {
  layer: MapWidgetLayer;
  /** The dashboard's (single) area — outline, label + default viewport fit. */
  aoi: { source: string; src_id: string; name: string } | undefined;
  bboxOverride: [number, number, number, number] | null;
  /** Full-width cards get a taller map. */
  tall?: boolean;
}) {
  const mapRef = useRef<MapRef>(null);

  // Legend-controlled raster opacity (0–100). 80 matches the explorer's
  // default dataset opacity and the legend's default display value.
  const [opacity, setOpacity] = useState<MapWidgetOpacity>({
    main: 80,
    context: 80,
  });

  useEffect(() => {
    // Idempotent; needed here because the dashboard page never mounts the
    // main explorer map, which is the usual registration point.
    registerPrimaryForestProtocol();
  }, []);

  // The area geometry — shared across the dashboard's map widgets via the
  // query cache; geometries are immutable, so never refetch.
  const { data: geometry } = useQuery({
    queryKey: ["aoi-geometry", aoi?.source, aoi?.src_id],
    queryFn: () => fetchGeometry(aoi!.source, aoi!.src_id),
    enabled: !!aoi,
    staleTime: Infinity,
  });

  const aoiBbox = useMemo<[number, number, number, number] | null>(() => {
    if (!geometry?.geometry) return null;
    // Naive bbox — antimeridian-crossing areas get a wide box. Acceptable
    // here: dashboard AOIs don't carry a backend bbox to prefer.
    const [west, south, east, north] = turfBbox(geometry.geometry);
    return [west, south, east, north];
  }, [geometry]);

  const bounds = bboxOverride ?? aoiBbox;

  const fitToBounds = () => {
    if (!bounds || !mapRef.current) return;
    mapRef.current.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      {
        // Extra top headroom: the area label chip hangs above the bbox corner.
        padding: { top: 56, right: 32, bottom: 32, left: 32 },
        duration: 0,
      }
    );
  };

  // The map and the geometry load in either order — fit on whichever
  // completes last (the effect covers late bounds, onLoad covers late maps).
  useEffect(fitToBounds, [bounds]);

  // Re-centre the area whenever the card resizes (size toggle, grid reflow,
  // window resize). The observer only sees the container; the latest fit
  // callback rides in a ref so we never re-observe.
  const containerRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef(fitToBounds);
  fitRef.current = fitToBounds;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      // Next frame, so MapLibre's own resize handling runs first.
      requestAnimationFrame(() => fitRef.current());
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={containerRef}
      h={{ base: "280px", md: tall ? "520px" : "360px" }}
      rounded="md"
      overflow="hidden"
      borderWidth="1px"
      borderColor="#DDE2F5"
    >
      <MapGl
        ref={mapRef}
        style={{ width: "100%", height: "100%" }}
        initialViewState={{ longitude: 0, latitude: 0, zoom: 1 }}
        onLoad={fitToBounds}
        // No scroll-zoom: the widget sits in a scrolling page and must not
        // trap the wheel. Pan/double-click zoom remain available.
        scrollZoom={false}
        dragRotate={false}
        attributionControl={false}
      >
        {/* Bottom-left so the legend can occupy the design's bottom-right
            slot; the attribution stacks beneath the zoom buttons. */}
        <NavigationControl position="bottom-left" showCompass={false} />
        <AttributionControl compact position="bottom-left" />
        <Source
          id="widget-basemap"
          type="raster"
          tiles={[
            buildBasemapTileUrl(
              BASEMAP_STYLE,
              MAPBOX_ACCESS_TOKEN,
              typeof window === "undefined" ? 1 : window.devicePixelRatio
            ),
          ]}
        >
          <Layer id="widget-basemap" type="raster" />
        </Source>
        {/* Declaration order is stacking order: context under main, outline on top. */}
        {layer.contextTileUrl && (
          <Source
            id="widget-context"
            type="raster"
            tiles={[layer.contextTileUrl]}
            tileSize={256}
          >
            <Layer
              id="widget-context"
              type="raster"
              paint={{ "raster-opacity": opacity.context / 100 }}
            />
          </Source>
        )}
        <Source
          id="widget-tiles"
          type="raster"
          tiles={[layer.tileUrl]}
          tileSize={256}
          // Imagery mosaics only exist for a bounded zoom range; spread
          // conditionally so unset keys stay out of the source spec.
          {...(layer.minzoom !== undefined ? { minzoom: layer.minzoom } : {})}
          {...(layer.maxzoom !== undefined ? { maxzoom: layer.maxzoom } : {})}
        >
          <Layer
            id="widget-tiles"
            type="raster"
            paint={{ "raster-opacity": opacity.main / 100 }}
          />
        </Source>
        {geometry?.geometry && (
          <Source id="widget-aoi" type="geojson" data={geometry.geometry}>
            {/* The explorer's boundary treatment: contrasting casing under
                the main line (shared paints, zoom-interpolated widths). */}
            <Layer
              id="widget-aoi-casing"
              type="line"
              paint={aoiCasingPaint(AOI_COLORS.casingColor)}
            />
            <Layer
              id="widget-aoi-line"
              type="line"
              paint={aoiLinePaint(AOI_COLORS.mainLineColor)}
            />
          </Source>
        )}
        {aoiBbox && (
          <Source
            id="widget-aoi-bbox"
            type="geojson"
            data={createBboxPolygon(aoiBbox)}
          >
            <Layer
              id="widget-aoi-bbox-line"
              type="line"
              paint={aoiBboxLinePaint(AOI_COLORS.mainLineColor)}
            />
          </Source>
        )}
        {/* Area label pinned to the bbox corner, as on the explorer map —
            minus the close trigger: a dashboard's area is fixed. */}
        {aoiBbox && aoi?.name && (
          <Marker
            longitude={aoiBbox[0]}
            latitude={aoiBbox[3]}
            anchor="bottom-left"
          >
            <Tag.Root
              colorPalette="primary"
              px={2}
              py={1}
              size="md"
              variant="solid"
              roundedBottom="none"
            >
              <Tag.StartElement>
                <PolygonIcon />
              </Tag.StartElement>
              <Tag.Label fontWeight="medium">{aoi.name}</Tag.Label>
            </Tag.Root>
          </Marker>
        )}
        {/* Non-map children render as DOM overlays inside the map container
            (same pattern as the explorer's Map.tsx). */}
        <Box
          position="absolute"
          bottom="8px"
          right="8px"
          zIndex={1}
          w="300px"
          maxW="calc(100% - 16px)"
        >
          <DashboardMapLegend
            layer={layer}
            opacity={opacity}
            onOpacityChange={(target, value) =>
              setOpacity((prev) => ({ ...prev, [target]: value }))
            }
          />
        </Box>
      </MapGl>
    </Box>
  );
}
