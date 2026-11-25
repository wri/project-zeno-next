import { Fragment, useEffect, useMemo, useRef } from "react";
import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { ImageBrokenIcon, MapPinSimpleIcon } from "@phosphor-icons/react";
import {
  SCENE_LIMITS,
  type CaptureStatus,
  type Scene,
} from "../../model/scenes";
import type { Sentinel2Request } from "../../model/request";
import { formatSceneDate } from "./cloudCover";
import { SCENE_CARD_SIZE, SceneCard, SceneCardSkeleton } from "./SceneCard";

type Bounds = [number, number, number, number];

export interface SceneStripResult {
  status: Exclude<CaptureStatus, "searching">;
  /** Every scene the search found. */
  candidates: Scene[];
  /** Ids of the scenes the map draws. */
  onMapIds: Set<string>;
}

/**
 * The focus editor's search results: every scene the search found, oldest
 * first, as preview cards with a marker at the target date. Updates on each
 * new search; the old cards fade while it runs.
 */
export function SceneStrip(props: {
  draft: Sentinel2Request;
  result: SceneStripResult | null;
  searching: boolean;
  bounds?: Bounds;
  onHover: (id: string | null) => void;
  onPick: (scene: Scene) => void;
  onChange: (patch: Partial<Sentinel2Request>) => void;
}) {
  const { draft, result, searching, bounds, onHover, onPick, onChange } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  const ordered = useMemo(
    () =>
      [...(result?.candidates ?? [])].sort(
        (a, b) =>
          a.datetime.localeCompare(b.datetime) || a.id.localeCompare(b.id)
      ),
    [result]
  );
  const markerIndex = ordered.findIndex(
    (s) => s.datetime.slice(0, 10) > draft.targetDate
  );
  const years = new Set(ordered.map((s) => s.datetime.slice(0, 4)));
  const showYear = years.size > 1;

  // Bring the target date into view when the results change.
  useEffect(() => {
    const scroller = scrollRef.current;
    const marker = markerRef.current;
    if (!scroller || !marker) return;
    scroller.scrollTo({
      left: marker.offsetLeft - scroller.clientWidth / 2,
      behavior: "smooth",
    });
  }, [ordered, draft.targetDate]);

  const onMapCount = result?.onMapIds.size ?? 0;
  const marker = (
    <Flex
      ref={markerRef}
      key="target-marker"
      flexDir="column"
      alignItems="center"
      flexShrink={0}
      w="34px"
      h={`${SCENE_CARD_SIZE}px`}
      title={`Target date: ${formatSceneDate(draft.targetDate, true)}`}
    >
      <MapPinSimpleIcon
        size={14}
        weight="fill"
        color="var(--chakra-colors-primary-700)"
      />
      <Box flex={1} w="2px" bg="primary.700" rounded="full" my="2px" />
      <Text
        fontFamily="mono"
        fontSize="9px"
        color="primary.800"
        textAlign="center"
        lineHeight="1.1"
      >
        {formatSceneDate(draft.targetDate)}
      </Text>
    </Flex>
  );

  return (
    <Flex flexDir="column" gap={2} minW={0}>
      <Flex alignItems="center" gap={2} minH="20px">
        <Text
          fontFamily="mono"
          fontSize="10px"
          color="#737C94"
          letterSpacing="0.04em"
        >
          SCENES
        </Text>
        {result && result.status === "ok" && (
          <Text fontSize="xs" color="fg">
            <b>{ordered.length}</b> found ·{" "}
            <Box as="span" color="primary.700" fontWeight="semibold">
              {onMapCount} on the map
            </Box>
            {ordered.length > onMapCount && (
              <Box as="span" color="fg.muted">
                {" "}
                (limit {SCENE_LIMITS.maxScenesPerTile} per tile,{" "}
                {SCENE_LIMITS.maxScenes} in total)
              </Box>
            )}
          </Text>
        )}
        {searching && (
          <Flex alignItems="center" gap={1.5} color="fg.muted">
            <Spinner size="xs" />
            <Text fontSize="xs">Searching…</Text>
          </Flex>
        )}
        <Flex ml="auto" alignItems="center" gap={3} hideBelow="md">
          <Legend ring label="On the map" />
          <Legend label="Not used" />
        </Flex>
      </Flex>

      <Box
        ref={scrollRef}
        overflowX="auto"
        overflowY="hidden"
        mx={-4}
        px={4}
        pt="6px"
        pb="8px"
        opacity={searching && result ? 0.55 : 1}
        transition="opacity 0.2s ease"
        css={{ scrollbarWidth: "thin" }}
      >
        {!result ? (
          <Flex gap={2}>
            {Array.from({ length: 10 }, (_, i) => (
              <SceneCardSkeleton key={i} index={i} />
            ))}
          </Flex>
        ) : result.status !== "ok" ? (
          <EmptyState
            draft={draft}
            status={result.status}
            onChange={onChange}
          />
        ) : (
          // Keyed by the result, so the cards animate in on each new search.
          <Flex gap={2} key={ordered.map((s) => s.id).join()} w="max-content">
            {ordered.map((scene, index) => (
              <Fragment key={scene.id}>
                {index === markerIndex && marker}
                <SceneCard
                  scene={scene}
                  bounds={bounds}
                  onMap={result.onMapIds.has(scene.id)}
                  showYear={showYear}
                  index={index}
                  onHover={onHover}
                  onPick={onPick}
                />
              </Fragment>
            ))}
            {markerIndex === -1 && marker}
          </Flex>
        )}
      </Box>
    </Flex>
  );
}

function Legend({ ring, label }: { ring?: boolean; label: string }) {
  return (
    <Flex alignItems="center" gap={1.5}>
      <Box
        w="12px"
        h="12px"
        rounded="3px"
        bg={ring ? "#3E6B8F" : "#9AA1B4"}
        opacity={ring ? 1 : 0.6}
        outline="2px solid"
        outlineColor={ring ? "primary.500" : "transparent"}
        outlineOffset="1px"
      />
      <Text fontSize="11px" color="fg.muted">
        {label}
      </Text>
    </Flex>
  );
}

/** No scenes to show: say why, and offer the fixes that would find some. */
function EmptyState(props: {
  draft: Sentinel2Request;
  status: Exclude<CaptureStatus, "searching" | "ok">;
  onChange: (patch: Partial<Sentinel2Request>) => void;
}) {
  const { draft, status, onChange } = props;
  const text =
    status === "no_scenes"
      ? "No scenes match this date, window and cloud limit."
      : status === "too_large"
        ? "This area is too large for satellite imagery."
        : "Couldn't search for scenes.";
  return (
    <Flex
      h={`${SCENE_CARD_SIZE}px`}
      alignItems="center"
      gap={3}
      px={4}
      rounded="lg"
      border="1px dashed"
      borderColor="border"
      bg="bg.subtle"
    >
      <ImageBrokenIcon size={22} color="#737C94" />
      <Text fontSize="sm" color="fg.muted">
        {text}
      </Text>
      {status === "no_scenes" && (
        <Flex gap={1.5}>
          {draft.windowDays < 30 && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => onChange({ windowDays: 30 })}
            >
              Widen to ±30 days
            </Button>
          )}
          {draft.maxCloudCover < 80 && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => onChange({ maxCloudCover: 80 })}
            >
              Allow 80% cloud
            </Button>
          )}
        </Flex>
      )}
      {status === "error" && (
        <Button
          size="xs"
          variant="outline"
          onClick={() => onChange({ ...draft })}
        >
          Try again
        </Button>
      )}
    </Flex>
  );
}
