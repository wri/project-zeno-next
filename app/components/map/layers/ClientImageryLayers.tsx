import { Suspense, useMemo } from "react";
import { Flex, Spinner, Text } from "@chakra-ui/react";
import { ImageBrokenIcon } from "@phosphor-icons/react";
import type { FeatureCollection } from "geojson";
import { Layer, Marker, Source } from "react-map-gl/maplibre";
import useMapStore from "@/app/store/mapStore";
import useImageryFocusStore from "@/app/store/imageryFocusStore";
import { createBboxPolygon } from "@/app/utils/bboxUtils";
import {
  Sentinel2Layers,
  type CaptureStatus,
  type Sentinel2LayerCapture,
} from "@/src/features/imagery";
import { RASTER_TOP_SENTINEL_ID } from "./DynamicTileLayers";

/**
 * An empty MapLibre layer that marks where client-rendered imagery goes.
 * Mounted before the raster-top sentinel, so it sits under every raster in
 * DynamicTileLayers (those anchor below the raster-top sentinel); deck.gl
 * draws the imagery just below it. A fixed anchor, unlike a dataset layer
 * id, never disappears while deck.gl references it.
 */
export const IMAGERY_SENTINEL_ID = "client-imagery-sentinel";

export function ImageryAnchorLayer() {
  return (
    <Source
      id="client-imagery-sentinel-source"
      type="geojson"
      data={{ type: "FeatureCollection", features: [] }}
    >
      <Layer id={IMAGERY_SENTINEL_ID} type="line" paint={{}} />
    </Source>
  );
}

/**
 * The client-rendered Sentinel-2 captures (layers with `sentinel2` state).
 * The deck.gl chunk loads only once the first such capture exists.
 */
export default function ClientImageryLayers() {
  const layers = useMapStore((s) => s.layers);
  const focusing = useImageryFocusStore((s) => s.original !== null);
  const focusSearch = useImageryFocusStore((s) => s.searched);
  const captures = useMemo<Sentinel2LayerCapture[]>(
    () =>
      // The focus editor previews its draft alone. Until the first search
      // returns, the map shows no imagery rather than the old capture.
      focusing
        ? focusSearch
          ? [
              {
                id: `focus-${focusSearch.key}`,
                scenes: focusSearch.result.scenes,
                visible: true,
                opacity: 1,
              },
            ]
          : []
        : layers.flatMap((l) =>
            l.sentinel2
              ? [
                  {
                    id: l.id,
                    scenes: l.sentinel2.scenes,
                    visible: l.visible,
                    opacity: l.opacity ?? 1,
                  },
                ]
              : []
          ),
    [layers, focusing, focusSearch]
  );
  if (captures.length === 0) return null;
  return (
    <>
      <Suspense fallback={null}>
        <Sentinel2Layers captures={captures} beforeId={IMAGERY_SENTINEL_ID} />
      </Suspense>
      {!focusing && <ImageryStatusMarkers />}
    </>
  );
}

const STATUS_TEXT: Partial<Record<CaptureStatus, string>> = {
  searching: "Searching Sentinel-2 scenes…",
  no_scenes: "No imagery: no scenes match the date, window and cloud limit",
  too_large: "No imagery: this area is too large",
  error: "No imagery: the scene search failed",
};

/**
 * Where a visible Sentinel-2 capture shows nothing, say so on the map: an
 * empty dashed box over the area's bounds with the reason, instead of a map
 * that looks like the imagery never loaded. While the search runs, the label
 * says so. Above the rasters, below the area outlines.
 */
function ImageryStatusMarkers() {
  const layers = useMapStore((s) => s.layers);
  const marked = useMemo(
    () =>
      layers.flatMap((l) => {
        const status = l.sentinel2?.status;
        if (!l.visible || !status || !STATUS_TEXT[status] || !l.bounds) {
          return [];
        }
        return [{ id: l.id, status, bounds: l.bounds }];
      }),
    [layers]
  );
  const boxes = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: marked
        .filter((m) => m.status !== "searching")
        .map((m) => createBboxPolygon(m.bounds)),
    }),
    [marked]
  );

  return (
    <>
      <Source id="imagery-status-boxes" type="geojson" data={boxes}>
        <Layer
          id="imagery-status-box-fill"
          type="fill"
          beforeId={RASTER_TOP_SENTINEL_ID}
          paint={{ "fill-color": "#737C94", "fill-opacity": 0.12 }}
        />
        <Layer
          id="imagery-status-box-line"
          type="line"
          beforeId={RASTER_TOP_SENTINEL_ID}
          paint={{
            "line-color": "#3A4048",
            "line-width": 1.5,
            "line-dasharray": [3, 2],
          }}
        />
      </Source>
      {marked.map(({ id, status, bounds: [west, south, east, north] }) => (
        <Marker
          key={id}
          longitude={(west + east) / 2}
          latitude={(south + north) / 2}
          anchor="center"
        >
          <Flex
            alignItems="center"
            gap={1.5}
            px={2}
            py={1}
            maxW="240px"
            rounded="md"
            bg="white"
            borderWidth="1px"
            borderColor="#DDE2F5"
            boxShadow="sm"
            pointerEvents="none"
          >
            {status === "searching" ? (
              <Spinner size="xs" color="#737C94" />
            ) : (
              <ImageBrokenIcon size={14} color="#3A4048" />
            )}
            <Text fontSize="xs" color="#3A4048">
              {STATUS_TEXT[status]}
            </Text>
          </Flex>
        </Marker>
      ))}
    </>
  );
}
