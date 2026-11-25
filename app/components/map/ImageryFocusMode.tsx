import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Box, Button, Flex, Heading, IconButton, Text } from "@chakra-ui/react";
import {
  ArrowCounterClockwiseIcon,
  MagnifyingGlassPlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Layer, Source, useMap } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";
import useImageryFocusStore from "@/app/store/imageryFocusStore";
import { searchSentinel2 } from "@/app/store/sentinel2Captures";
import { createBboxPolygon } from "@/app/utils/bboxUtils";
import {
  FocusFilters,
  SCENE_LIMITS,
  SceneStrip,
  encodeRecipe,
  type SceneStripResult,
} from "@/src/features/imagery";

const SEARCH_DEBOUNCE_MS = 350;
/** The filter column's width on desktop; the map frames the area beside it. */
const FILTERS_WIDTH = 372;
const GUTTER = 16;

/**
 * The imagery focus editor (Edit on the imagery legend entry). The map
 * becomes a stage for one Sentinel-2 capture: the filters fill a column on
 * the left, every scene the search finds lines the top as a preview card,
 * and the map shows the draft's scenes as they would be drawn (see
 * ClientImageryLayers). Each filter change searches again. Closing applies
 * the draft as the live capture.
 *
 * Render inside react-map-gl's `<Map>`: it frames the area and draws the
 * hovered scene's footprint.
 */
export default function ImageryFocusMode() {
  const open = useImageryFocusStore((s) => s.original !== null);
  if (!open) return null;
  return <FocusOnMap />;
}

/** The map side of the editor: framing, zoom and the hovered footprint. */
function FocusOnMap() {
  const bounds = useImageryFocusStore((s) => s.bounds);
  const searched = useImageryFocusStore((s) => s.searched);
  const hoveredSceneId = useImageryFocusStore((s) => s.hoveredSceneId);
  const { current: map } = useMap();
  const stripRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(() => map?.getZoom() ?? 0);

  useEffect(() => {
    if (!map) return;
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoomend", onZoom);
    return () => {
      map.off("zoomend", onZoom);
    };
  }, [map]);

  // Frame the area in the free part of the map: right of the filters and
  // below the scene strip. An area too large to show whole at the imagery's
  // minimum zoom gets its centre at that zoom instead, so the imagery shows.
  const frame = () => {
    if (!map || !bounds) return;
    const desktop = window.matchMedia("(min-width: 48rem)").matches;
    const stripBottom = stripRef.current?.getBoundingClientRect().bottom ?? 0;
    const mapTop = map.getContainer().getBoundingClientRect().top;
    const padding = {
      top: Math.max(40, stripBottom - mapTop + 32),
      left: desktop ? FILTERS_WIDTH + 2 * GUTTER + 24 : 24,
      right: 48,
      bottom: 56,
    };
    const box: [[number, number], [number, number]] = [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]],
    ];
    const camera = map.cameraForBounds(box, { padding, maxZoom: 14 });
    if (camera?.zoom !== undefined && camera.zoom >= SCENE_LIMITS.minZoom) {
      map.fitBounds(box, { padding, maxZoom: 14, duration: 600 });
    } else {
      map.easeTo({
        center: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2],
        zoom: SCENE_LIMITS.minZoom + 0.5,
        padding,
        duration: 600,
      });
    }
  };
  const framed = useRef(false);
  useEffect(() => {
    if (framed.current || !bounds || !map) return;
    framed.current = true;
    frame();
    // `frame` reads the latest bounds; run once, when they are first known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, map]);

  const hovered = searched?.result.candidates.find(
    (s) => s.id === hoveredSceneId
  );
  const footprint = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: hovered ? [createBboxPolygon(hovered.bbox)] : [],
    }),
    [hovered]
  );

  return (
    <>
      {/* The hovered scene's footprint (its whole 110 km tile) */}
      <Source id="imagery-focus-footprint" type="geojson" data={footprint}>
        <Layer
          id="imagery-focus-footprint-fill"
          type="fill"
          paint={{ "fill-color": "#4F7CC4", "fill-opacity": 0.12 }}
        />
        <Layer
          id="imagery-focus-footprint-line"
          type="line"
          paint={{ "line-color": "#21509A", "line-width": 2 }}
        />
      </Source>
      <ImageryFocusPanels
        stripRef={stripRef}
        zoom={zoom}
        onZoomToArea={frame}
      />
    </>
  );
}

/**
 * The editor's panels over the map: the filter column, the scene strip, the
 * close button and the map status. Needs no map, so it also renders outside
 * react-map-gl. Runs the draft's searches.
 */
export function ImageryFocusPanels(props: {
  stripRef?: RefObject<HTMLDivElement | null>;
  /** The map's zoom; below the imagery's minimum zoom, a warning shows. */
  zoom?: number;
  onZoomToArea?: () => void;
}) {
  const { stripRef, zoom, onZoomToArea } = props;
  const tooFarOut = zoom !== undefined && zoom < SCENE_LIMITS.minZoom;
  const draft = useImageryFocusStore((s) => s.draft)!;
  const original = useImageryFocusStore((s) => s.original)!;
  const bounds = useImageryFocusStore((s) => s.bounds);
  const searched = useImageryFocusStore((s) => s.searched);
  const hoveredSceneId = useImageryFocusStore((s) => s.hoveredSceneId);
  const { updateDraft, resetDraft, setSearched, setHoveredScene, close } =
    useImageryFocusStore.getState();

  const draftKey = encodeRecipe(draft);
  const changed = draftKey !== encodeRecipe(original);
  const searching = searched?.key !== draftKey;

  // Search the draft's scenes, debounced while the user drags the date.
  // Keyed on the draft object: "Try again" re-sets an identical draft.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      searchSentinel2(draft)
        .then(({ result, bounds: areaBounds }) => {
          if (!cancelled) setSearched(draft, result, areaBounds);
        })
        .catch(() => {
          if (cancelled) return;
          setSearched(
            draft,
            {
              status: "error",
              scenes: [],
              candidates: [],
              found: 0,
              summary: { itemCount: 0 },
            },
            useImageryFocusStore.getState().bounds ?? [0, 0, 0, 0]
          );
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft, setSearched]);

  // Escape closes the editor and keeps the changes, like the close button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const result = useMemo<SceneStripResult | null>(
    () =>
      searched
        ? {
            status: searched.result.status,
            candidates: searched.result.candidates,
            onMapIds: new Set(searched.result.scenes.map((s) => s.id)),
          }
        : null,
    [searched]
  );

  const timelineScenes = useMemo(
    () =>
      result
        ? result.candidates.map((s) => ({
            id: s.id,
            datetime: s.datetime,
            cloudCover: s.cloudCover,
            onMap: result.onMapIds.has(s.id),
          }))
        : [],
    [result]
  );

  const areaName = draft.aoiNames.length
    ? draft.aoiNames.join(", ")
    : "this area";
  const onMapCount = result?.onMapIds.size ?? 0;

  return (
    <Box
      position="absolute"
      inset={0}
      zIndex={450}
      pointerEvents="none"
      css={{
        animation: "imageryFocusIn 0.25s ease both",
        "@keyframes imageryFocusIn": { from: { opacity: 0 } },
      }}
    >
      {/* Top row: scene strip and the close button */}
      <Flex
        position="absolute"
        top={`${GUTTER}px`}
        left={{ base: `${GUTTER}px`, md: `${FILTERS_WIDTH + 2 * GUTTER}px` }}
        right={`${GUTTER}px`}
        gap={3}
        alignItems="flex-start"
      >
        <Box
          ref={stripRef}
          flex={1}
          minW={0}
          bg="bg"
          rounded="xl"
          boxShadow="lg"
          px={4}
          pt={3}
          pb={1}
          pointerEvents="all"
        >
          <SceneStrip
            draft={draft}
            result={result}
            searching={searching}
            bounds={bounds ?? undefined}
            onHover={setHoveredScene}
            onPick={(scene) =>
              updateDraft({
                targetDate: scene.datetime.slice(0, 10),
                sort: "date",
              })
            }
            onChange={updateDraft}
          />
        </Box>
        <IconButton
          aria-label="Close the imagery editor"
          title="Done (Esc): show these settings on the map"
          size="lg"
          rounded="full"
          bg="bg"
          color="fg"
          boxShadow="lg"
          pointerEvents="all"
          _hover={{ bg: "bg.muted" }}
          onClick={() => close()}
        >
          <XIcon />
        </IconButton>
      </Flex>

      {/* Left column: what is shown and the filters */}
      <Flex
        position="absolute"
        top={{ base: "196px", md: `${GUTTER}px` }}
        left={`${GUTTER}px`}
        bottom={{ base: `${GUTTER}px`, md: "auto" }}
        w={{ base: `calc(100% - ${2 * GUTTER}px)`, md: `${FILTERS_WIDTH}px` }}
        maxH={{ md: `calc(100% - ${2 * GUTTER + 24}px)` }}
        flexDir="column"
        bg="bg"
        rounded="xl"
        boxShadow="lg"
        pointerEvents="all"
        overflow="hidden"
      >
        <Box px={5} pt={4} pb={3} borderBottomWidth="1px" borderColor="border">
          <Flex alignItems="center" gap={2} mb={1}>
            <Flex
              h="16px"
              px="5px"
              alignItems="center"
              rounded="4px"
              bg="#F0F9B9"
            >
              <Text
                fontFamily="mono"
                fontSize="9px"
                lineHeight="16px"
                color="#23271A"
                textTransform="uppercase"
              >
                Imagery
              </Text>
            </Flex>
            <Text fontSize="xs" color="fg.muted">
              Sentinel-2 · true colour
            </Text>
          </Flex>
          <Heading as="h2" size="md" lineHeight="short">
            Satellite imagery for {areaName}
          </Heading>
        </Box>
        <Box overflowY="auto" px={5} py={4}>
          <FocusFilters
            draft={draft}
            scenes={timelineScenes}
            hoveredId={hoveredSceneId}
            onChange={updateDraft}
          />
        </Box>
        <Flex
          px={5}
          py={3}
          gap={2}
          borderTopWidth="1px"
          borderColor="border"
          alignItems="center"
        >
          <Button
            size="sm"
            variant="ghost"
            disabled={!changed}
            onClick={resetDraft}
          >
            <ArrowCounterClockwiseIcon />
            Reset
          </Button>
          <Button
            size="sm"
            variant="ghost"
            ml="auto"
            onClick={() => close({ apply: false })}
          >
            Discard
          </Button>
          <Button size="sm" colorPalette="primary" onClick={() => close()}>
            {changed ? "Show this imagery" : "Done"}
          </Button>
        </Flex>
      </Flex>

      {/* Too far out: the imagery is not drawn. A card in the middle of the
          free map area says so, instead of a map that looks empty. */}
      {tooFarOut && (
        <Flex
          position="absolute"
          top={{ base: "40%", md: "50%" }}
          left={{ base: 0, md: `${FILTERS_WIDTH + 2 * GUTTER}px` }}
          right={0}
          justifyContent="center"
          px={4}
        >
          <Flex
            role="status"
            flexDir="column"
            alignItems="center"
            gap={3}
            maxW="340px"
            px={6}
            py={5}
            rounded="xl"
            bg="bg"
            boxShadow="xl"
            textAlign="center"
            pointerEvents="all"
            css={{
              animation: "zoomWarningIn 0.2s ease both",
              "@keyframes zoomWarningIn": {
                from: { opacity: 0, transform: "translateY(6px)" },
              },
            }}
          >
            <Flex
              w="44px"
              h="44px"
              rounded="full"
              bg="primary.50"
              color="primary.700"
              alignItems="center"
              justifyContent="center"
            >
              <MagnifyingGlassPlusIcon size={24} />
            </Flex>
            <Box>
              <Text fontWeight="semibold" fontSize="sm">
                Zoom in to see the imagery
              </Text>
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Satellite scenes show from zoom level {SCENE_LIMITS.minZoom}.
                The map is at {Math.floor(zoom * 10) / 10}.
              </Text>
            </Box>
            {onZoomToArea && (
              <Button size="sm" colorPalette="primary" onClick={onZoomToArea}>
                <MagnifyingGlassPlusIcon />
                Zoom to {areaName}
              </Button>
            )}
          </Flex>
        </Flex>
      )}

      {/* Map status, bottom centre of the free map area */}
      <Flex
        position="absolute"
        bottom={8}
        left={{ base: 0, md: `${FILTERS_WIDTH + 2 * GUTTER}px` }}
        right={0}
        justifyContent="center"
        hideBelow="md"
        display={tooFarOut ? "none" : undefined}
      >
        <Flex
          alignItems="center"
          gap={2}
          px={3}
          py={1.5}
          rounded="full"
          bg="rgba(15, 27, 36, 0.78)"
          color="white"
          fontSize="xs"
          pointerEvents="all"
          boxShadow="md"
        >
          {!result ? (
            <Text>Searching Sentinel-2 scenes…</Text>
          ) : result.status === "ok" ? (
            <Text>
              Previewing {onMapCount} scene{onMapCount === 1 ? "" : "s"} on the
              map
              {changed ? " · applied when you close" : ""}
            </Text>
          ) : (
            <Text>No imagery to show</Text>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}
