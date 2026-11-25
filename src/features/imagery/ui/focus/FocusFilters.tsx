import type { ReactNode } from "react";
import { Box, Button, Flex, IconButton, Input, Text } from "@chakra-ui/react";
import {
  CalendarDotIcon,
  CaretLeftIcon,
  CaretRightIcon,
  SunIcon,
} from "@phosphor-icons/react";
import {
  CLOUD_OPTIONS,
  DEFAULT_SORT,
  FIRST_SCENE_DATE,
  WINDOW_OPTIONS,
  searchRange,
  shiftIsoDate,
  type SceneSort,
  type Sentinel2Request,
} from "../../model/request";
import { cloudWeather, formatSceneDate } from "./cloudCover";
import { DateTimeline, type TimelineScene } from "./DateTimeline";

/** Mono label above a control, as on the legend chips. */
function FieldLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <Flex justifyContent="space-between" alignItems="baseline" mb="8px" gap={2}>
      <Text
        fontFamily="mono"
        fontSize="10px"
        color="#737C94"
        letterSpacing="0.04em"
      >
        {children}
      </Text>
      {hint && (
        <Text fontSize="11px" color="fg.muted" truncate>
          {hint}
        </Text>
      )}
    </Flex>
  );
}

/** A big toggle tile: the filters' visual building block. */
function Tile(props: {
  selected: boolean;
  /** Within the allowed range (lighter highlight), for "up to" scales. */
  included?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const { selected, included, label, onClick, children } = props;
  return (
    <Button
      variant="outline"
      flex={1}
      minW={0}
      h="auto"
      py="8px"
      px="4px"
      flexDir="column"
      gap="6px"
      rounded="md"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      bg={selected ? "primary.50" : included ? "#F7F9FE" : "bg"}
      borderColor={selected ? "primary.400" : "border"}
      color={selected ? "primary.800" : "fg"}
      _hover={{ borderColor: "primary.300" }}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/** How wide a window bar is drawn, by days (±60 d fills the tile). */
const windowBarWidth = (days: number) =>
  `${Math.round(18 + (days / 60) * 82)}%`;

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * The focus editor's filters, drawn as pictures: a timeline for the date and
 * window, weather icons for the cloud limit, and two tiles for which scenes
 * go on top.
 */
export function FocusFilters(props: {
  draft: Sentinel2Request;
  scenes: TimelineScene[];
  hoveredId: string | null;
  onChange: (patch: Partial<Sentinel2Request>) => void;
}) {
  const { draft, scenes, hoveredId, onChange } = props;
  const today = todayIso();
  const sort = draft.sort ?? DEFAULT_SORT;
  const { start, end } = searchRange(draft, today);
  const clampDate = (iso: string) =>
    iso < FIRST_SCENE_DATE ? FIRST_SCENE_DATE : iso > today ? today : iso;
  const step = (direction: -1 | 1) =>
    onChange({
      targetDate: clampDate(
        shiftIsoDate(draft.targetDate, direction * (2 * draft.windowDays + 1))
      ),
    });

  return (
    <Flex flexDir="column" gap={5}>
      <div>
        <FieldLabel
          hint={`${formatSceneDate(start)} – ${formatSceneDate(end, true)}`}
        >
          DATE
        </FieldLabel>
        <DateTimeline
          targetDate={draft.targetDate}
          windowDays={draft.windowDays}
          maxCloudCover={draft.maxCloudCover}
          today={today}
          firstDate={FIRST_SCENE_DATE}
          scenes={scenes}
          hoveredId={hoveredId}
          onChange={(targetDate) => onChange({ targetDate })}
        />
        <Flex gap={1} mt={2} alignItems="center">
          <IconButton
            size="xs"
            variant="outline"
            aria-label="Previous window"
            title="Previous window"
            disabled={draft.targetDate <= FIRST_SCENE_DATE}
            onClick={() => step(-1)}
          >
            <CaretLeftIcon />
          </IconButton>
          <Input
            type="date"
            size="xs"
            flex={1}
            aria-label="Imagery date"
            min={FIRST_SCENE_DATE}
            max={today}
            value={draft.targetDate}
            onChange={(e) => {
              if (e.target.value)
                onChange({ targetDate: clampDate(e.target.value) });
            }}
          />
          <IconButton
            size="xs"
            variant="outline"
            aria-label="Next window"
            title="Next window"
            disabled={draft.targetDate >= today}
            onClick={() => step(1)}
          >
            <CaretRightIcon />
          </IconButton>
          <Button
            size="xs"
            variant="outline"
            disabled={draft.targetDate === today}
            onClick={() => onChange({ targetDate: today })}
          >
            Latest
          </Button>
        </Flex>
      </div>

      <div>
        <FieldLabel hint={`${draft.windowDays * 2 + 1} days searched`}>
          SEARCH WINDOW
        </FieldLabel>
        <Flex gap={1.5}>
          {WINDOW_OPTIONS.map((days) => (
            <Tile
              key={days}
              selected={draft.windowDays === days}
              label={`Search ±${days} days around the date`}
              onClick={() => onChange({ windowDays: days })}
            >
              <Flex
                w="100%"
                h="10px"
                alignItems="center"
                justifyContent="center"
              >
                <Box
                  w={windowBarWidth(days)}
                  h="6px"
                  rounded="full"
                  bg={draft.windowDays === days ? "primary.400" : "#C9CED6"}
                  position="relative"
                >
                  <Box
                    position="absolute"
                    left="50%"
                    top="-3px"
                    w="2px"
                    h="12px"
                    ml="-1px"
                    rounded="full"
                    bg={draft.windowDays === days ? "primary.800" : "#737C94"}
                  />
                </Box>
              </Flex>
              <Text fontFamily="mono" fontSize="11px">
                ±{days} d
              </Text>
            </Tile>
          ))}
        </Flex>
      </div>

      <div>
        <FieldLabel hint={cloudHint(draft.maxCloudCover)}>
          MAX CLOUD COVER
        </FieldLabel>
        <Flex gap={1.5}>
          {CLOUD_OPTIONS.map((cloud) => {
            // The icon for the cloudiest scene this limit lets in.
            const { icon: WeatherIcon } = cloudWeather(cloud - 1);
            const selected = draft.maxCloudCover === cloud;
            return (
              <Tile
                key={cloud}
                selected={selected}
                included={cloud < draft.maxCloudCover}
                label={`Allow up to ${cloud}% cloud`}
                onClick={() => onChange({ maxCloudCover: cloud })}
              >
                <WeatherIcon
                  size={22}
                  weight={selected ? "fill" : "duotone"}
                  color={
                    cloud <= 10
                      ? "#E3A008"
                      : cloud <= 30
                        ? "#C9A227"
                        : "#737C94"
                  }
                />
                <Text fontFamily="mono" fontSize="11px">
                  {cloud}%
                </Text>
              </Tile>
            );
          })}
        </Flex>
      </div>

      <div>
        <FieldLabel>ON TOP</FieldLabel>
        <Flex gap={1.5}>
          {(
            [
              {
                sort: "cloud",
                icon: SunIcon,
                title: "Clearest",
                text: "Least cloudy scenes first",
              },
              {
                sort: "date",
                icon: CalendarDotIcon,
                title: "Closest to date",
                text: "Scenes nearest the date first",
              },
            ] as const
          ).map((option) => {
            const selected = sort === option.sort;
            const OptionIcon = option.icon;
            return (
              <Tile
                key={option.sort}
                selected={selected}
                label={option.text}
                onClick={() => onChange({ sort: option.sort as SceneSort })}
              >
                <Flex alignItems="center" gap={1.5}>
                  <OptionIcon
                    size={16}
                    weight={selected ? "fill" : "regular"}
                  />
                  <Text fontSize="xs" fontWeight="semibold">
                    {option.title}
                  </Text>
                </Flex>
                <Text fontSize="10px" color="fg.muted" whiteSpace="normal">
                  {option.text}
                </Text>
              </Tile>
            );
          })}
        </Flex>
      </div>
    </Flex>
  );
}

function cloudHint(maxCloudCover: number): string {
  if (maxCloudCover <= 10) return "Only clear skies";
  if (maxCloudCover <= 30) return "Mostly clear skies";
  if (maxCloudCover <= 50) return "Some clouds allowed";
  if (maxCloudCover < 100) return "Cloudy scenes allowed";
  return "Any cloud cover";
}
