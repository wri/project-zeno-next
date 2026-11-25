import { useMemo } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import type { Scene } from "../../model/scenes";
import { SceneThumbnail } from "../SceneThumbnail";
import { cloudWeather, formatSceneDate } from "./cloudCover";

type Bounds = [number, number, number, number];

export const SCENE_CARD_SIZE = 96;

/**
 * One search result in the focus editor: the scene's preview cropped to the
 * area, its date, and its cloud cover as a weather badge. Scenes the map
 * draws have a ring; the others (cut by the scene limits) are faded.
 */
export function SceneCard(props: {
  scene: Scene;
  bounds?: Bounds;
  onMap: boolean;
  showYear: boolean;
  /** Position in the strip, for the staggered entry animation. */
  index: number;
  onHover: (id: string | null) => void;
  onPick: (scene: Scene) => void;
}) {
  const { scene, bounds, onMap, showYear, index, onHover, onPick } = props;
  // SceneThumbnail re-resolves when its inputs change identity.
  const scenes = useMemo(() => [{ ...scene, rank: 0 }], [scene]);
  const weather = cloudWeather(scene.cloudCover);
  const WeatherIcon = weather.icon;
  const date = formatSceneDate(scene.datetime, showYear);
  const cloud = Math.round(scene.cloudCover);
  // How much of its MGRS tile the scene images (swath edges are partial).
  const imaged = Math.round(100 - (scene.nodata ?? 0));
  const partial = imaged < 95;
  const coverage = partial ? `, images ${imaged}% of its tile` : "";

  return (
    <Box
      as="button"
      position="relative"
      flexShrink={0}
      w={`${SCENE_CARD_SIZE}px`}
      h={`${SCENE_CARD_SIZE}px`}
      rounded="lg"
      overflow="hidden"
      cursor="pointer"
      bg="#14304A"
      outline="2px solid"
      outlineColor={onMap ? "primary.500" : "transparent"}
      outlineOffset="2px"
      // Not desaturated: a grey card would read as a cloudy scene.
      opacity={onMap ? 1 : 0.7}
      transition="transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease"
      _hover={{
        transform: "translateY(-3px)",
        opacity: 1,
        boxShadow: "lg",
      }}
      _focusVisible={{ outlineColor: "primary.700" }}
      css={{
        animation: "sceneCardIn 0.28s ease both",
        animationDelay: `${Math.min(index, 20) * 22}ms`,
        "@keyframes sceneCardIn": {
          from: { opacity: 0, transform: "scale(0.9)" },
        },
      }}
      aria-label={`${formatSceneDate(scene.datetime, true)}, ${cloud}% cloud${coverage}, ${
        onMap ? "on the map" : "not on the map"
      }. Centre the search on this day.`}
      title={`${formatSceneDate(scene.datetime, true)} · ${weather.label}, ${cloud}% cloud${coverage}${
        onMap ? "" : " · not on the map (scene limit)"
      }\nClick to centre the search on this day`}
      onMouseEnter={() => onHover(scene.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(scene.id)}
      onBlur={() => onHover(null)}
      onClick={() => onPick(scene)}
    >
      <SceneThumbnail scenes={scenes} bounds={bounds} size={SCENE_CARD_SIZE} />
      {/* Weather badge */}
      <Flex
        position="absolute"
        top="5px"
        left="5px"
        alignItems="center"
        gap="3px"
        h="18px"
        px="5px"
        rounded="full"
        bg="rgba(15, 27, 36, 0.72)"
        backdropFilter="blur(2px)"
      >
        <WeatherIcon size={12} weight="fill" color={weather.color} />
        <Text fontFamily="mono" fontSize="9px" color="white" lineHeight="1">
          {cloud}%
        </Text>
      </Flex>
      {/* Partial tile: the scene's swath covers only part of the tile */}
      {partial && (
        <Flex
          position="absolute"
          top="5px"
          right="5px"
          alignItems="center"
          gap="3px"
          h="18px"
          px="5px"
          rounded="full"
          bg="rgba(15, 27, 36, 0.72)"
        >
          <Box
            w="9px"
            h="9px"
            rounded="2px"
            border="1px solid white"
            // Filled to the imaged share, like a battery.
            bg={`linear-gradient(to right, white ${imaged}%, transparent ${imaged}%)`}
          />
          <Text fontFamily="mono" fontSize="9px" color="white" lineHeight="1">
            {imaged}%
          </Text>
        </Flex>
      )}
      {/* Date strip */}
      <Flex
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        h="26px"
        alignItems="flex-end"
        px="6px"
        pb="4px"
        bg="linear-gradient(to top, rgba(15,27,36,0.85), rgba(15,27,36,0))"
      >
        <Text
          fontSize="11px"
          fontWeight="semibold"
          color="white"
          lineHeight="1"
          truncate
        >
          {date}
        </Text>
      </Flex>
    </Box>
  );
}

/** A grey placeholder card while the first search runs. */
export function SceneCardSkeleton({ index }: { index: number }) {
  return (
    <Box
      flexShrink={0}
      w={`${SCENE_CARD_SIZE}px`}
      h={`${SCENE_CARD_SIZE}px`}
      rounded="lg"
      bg="bg.muted"
      css={{
        animation: "sceneSkeleton 1.2s ease-in-out infinite",
        animationDelay: `${index * 90}ms`,
        "@keyframes sceneSkeleton": {
          "0%, 100%": { opacity: 0.45 },
          "50%": { opacity: 1 },
        },
      }}
    />
  );
}
