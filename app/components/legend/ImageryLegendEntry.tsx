import { Fragment, useState } from "react";
import {
  Box,
  ButtonGroup,
  Collapsible,
  Flex,
  Heading,
  IconButton,
  Image,
  Popover,
  Portal,
  Spinner,
  Switch,
  Text,
} from "@chakra-ui/react";
import {
  ArrowBendDownRightIcon,
  CaretDownIcon,
  CircleHalfIcon,
  InfoIcon,
  PolygonIcon,
  XIcon,
} from "@phosphor-icons/react";
import { OpacityControl } from "./OpacityControl";
import type {
  ImageryLegendCapture,
  ImageryLegendGroup,
  LayerActionHandler,
} from "./types";
import { ParamChip } from "@/app/components/ui/ParamChip";

/**
 * The "Satellite Imagery" legend section: one entry grouping every Sentinel-2
 * capture on the map (Figma node 1473:8288). Header controls act on the whole
 * group; the collapsed-by-default captures list toggles individual mosaics.
 * While the agent rebuilds a mosaic the body collapses to an updating state.
 */
export function ImageryLegendEntry(
  props: ImageryLegendGroup & {
    onLayerAction: LayerActionHandler;
    expanded?: boolean;
    onToggleExpand?: () => void;
    /** Tighter type and spacing for small hosts (dashboard map widgets). */
    compact?: boolean;
  }
) {
  const {
    id,
    title,
    subtitle,
    opacity,
    params,
    info,
    note,
    captures,
    areaCount,
    updating,
    thumbnailUrl,
    onLayerAction,
    expanded = false,
    onToggleExpand,
    compact,
  } = props;

  // "Collapse state as default" (Figma) — captures expand on demand.
  const [capturesOpen, setCapturesOpen] = useState(false);

  // Captures grouped by area, preserving capture order (newest first).
  const areaGroups: { areaLabel: string; captures: ImageryLegendCapture[] }[] =
    [];
  for (const capture of captures) {
    const group = areaGroups.find((g) => g.areaLabel === capture.areaLabel);
    if (group) {
      group.captures.push(capture);
    } else {
      areaGroups.push({ areaLabel: capture.areaLabel, captures: [capture] });
    }
  }

  return (
    <Flex
      flexDir="column"
      w="100%"
      minW={0}
      fontFamily="body"
      lineHeight="shorter"
    >
      {/* Header row — always visible */}
      <Flex justifyContent="space-between" gap={1} alignItems="center">
        <Flex
          gap={1}
          alignItems="center"
          fontSize="sm"
          cursor="pointer"
          onClick={onToggleExpand}
          flex={1}
          minW={0}
        >
          <IconButton
            variant="ghost"
            size="xs"
            p={0}
            minW="14px"
            h="14px"
            pointerEvents="none"
            css={{
              transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.15s ease",
            }}
          >
            <CaretDownIcon size={12} />
          </IconButton>
          <Heading as="h3" size={compact ? "xs" : "sm"} m={0} truncate>
            {title}
          </Heading>
          {/* IMAGERY badge — secondary/200 per Figma */}
          <Flex
            h="16px"
            px="5px"
            alignItems="center"
            rounded="4px"
            bg="#F0F9B9"
            flexShrink={0}
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
        </Flex>
        <ButtonGroup
          variant="ghost"
          size="xs"
          gap={0}
          flexShrink={0}
          css={{
            "& button": {
              h: compact ? 5 : 6,
              minW: compact ? 5 : 6,
            },
          }}
        >
          {info && (
            <Popover.Root>
              <Popover.Trigger asChild>
                <IconButton>
                  <InfoIcon />
                </IconButton>
              </Popover.Trigger>
              <Portal>
                <Popover.Positioner>
                  <Popover.Content>
                    <Popover.Arrow />
                    <Popover.Body>
                      <Popover.Title fontWeight="medium">
                        Layer information
                      </Popover.Title>
                      <Text my="4">{info}</Text>
                    </Popover.Body>
                  </Popover.Content>
                </Popover.Positioner>
              </Portal>
            </Popover.Root>
          )}
          <OpacityControl
            value={opacity}
            onValueChange={(value) =>
              onLayerAction({
                action: "opacity",
                payload: { id, opacity: value },
              })
            }
          >
            <IconButton>
              <CircleHalfIcon />
            </IconButton>
          </OpacityControl>
          <IconButton
            onClick={() => onLayerAction({ action: "remove", payload: { id } })}
          >
            <XIcon />
          </IconButton>
        </ButtonGroup>
      </Flex>

      {/* Collapsible body */}
      <Collapsible.Root open={expanded}>
        <Collapsible.Content css={{ transition: "height 0.15s ease" }}>
          {updating ? (
            <UpdatingBody compact={compact} />
          ) : (
            <Flex
              flexDir="column"
              gap={compact ? 1.5 : 2}
              pt={compact ? 1.5 : 2}
              pr={compact ? 2 : 4}
            >
              {/* Summary row: thumbnail + source/rendering label */}
              <Flex gap={2} alignItems="center" pl={compact ? 2 : 3}>
                <ImageryThumbnail src={thumbnailUrl} size={32} captioned />
                <Text fontSize="xs" color="#44505A" truncate>
                  {subtitle}
                </Text>
              </Flex>
              {params.length > 0 && (
                <Flex gap={1} flexWrap="wrap" alignItems="center">
                  {params.map((p) => (
                    <ParamChip
                      key={p.label}
                      label={p.label}
                      value={p.value}
                      colorScheme="purple"
                      bg="white"
                      maxValueWidth={p.maxValueWidth}
                    />
                  ))}
                </Flex>
              )}
              {note && <Text fontSize="xs">{note}</Text>}
              {captures.length > 0 && (
                <>
                  <Box h="1px" bg="border" mx={compact ? -2 : -4} />
                  {/* Captures summary row — toggles the captures list */}
                  <Flex
                    alignItems="center"
                    justifyContent="space-between"
                    cursor="pointer"
                    onClick={() => setCapturesOpen((prev) => !prev)}
                    role="button"
                    aria-expanded={capturesOpen}
                    aria-label={
                      capturesOpen ? "Collapse captures" : "Expand captures"
                    }
                  >
                    <Flex alignItems="center" gap={1}>
                      <ArrowBendDownRightIcon
                        size={12}
                        color="var(--chakra-colors-fg-muted)"
                      />
                      <Text fontFamily="mono" fontSize="10px" color="#737C94">
                        {captures.length} capture
                        {captures.length === 1 ? "" : "s"} · {areaCount} area
                        {areaCount === 1 ? "" : "s"}
                      </Text>
                    </Flex>
                    <Box
                      as="span"
                      color="#737C94"
                      css={{
                        transform: capturesOpen
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.15s ease",
                      }}
                    >
                      <CaretDownIcon size={12} />
                    </Box>
                  </Flex>
                  <Collapsible.Root open={capturesOpen}>
                    <Collapsible.Content
                      css={{ transition: "height 0.15s ease" }}
                    >
                      <Flex
                        flexDir="column"
                        gap="10px"
                        pl={compact ? 2 : 4}
                        pt={1}
                        pb={1}
                      >
                        {areaGroups.map((group, index) => (
                          <Fragment key={group.areaLabel}>
                            {index > 0 && <Box h="1px" bg="border" />}
                            <Flex flexDir="column" gap="6px">
                              <Flex gap={1} alignItems="center">
                                <PolygonIcon size={14} color="#3A4048" />
                                <Text
                                  fontSize="10px"
                                  fontWeight="semibold"
                                  color="#3A4048"
                                >
                                  {group.areaLabel}
                                </Text>
                              </Flex>
                              {group.captures.map((capture) => (
                                <CaptureRow
                                  key={capture.layerId}
                                  capture={capture}
                                  onLayerAction={onLayerAction}
                                />
                              ))}
                            </Flex>
                          </Fragment>
                        ))}
                      </Flex>
                    </Collapsible.Content>
                  </Collapsible.Root>
                </>
              )}
            </Flex>
          )}
        </Collapsible.Content>
      </Collapsible.Root>
    </Flex>
  );
}

/**
 * One capture (mosaic) row: thumbnail, date, search meta, LIVE badge on the
 * newest capture and a visibility toggle.
 */
function CaptureRow(props: {
  capture: ImageryLegendCapture;
  onLayerAction: LayerActionHandler;
}) {
  const { capture, onLayerAction } = props;

  return (
    <Flex alignItems="center" justifyContent="space-between" pl={2} gap={2}>
      <Flex gap={2} alignItems="center" minW={0}>
        <ImageryThumbnail src={capture.thumbnailUrl} size={24} />
        <Flex flexDir="column" gap="2px" minW={0}>
          <Text
            fontSize="xs"
            fontWeight={capture.live ? "semibold" : "normal"}
            color={capture.live ? "#3A4048" : "#737C94"}
            truncate
          >
            {capture.dateLabel}
          </Text>
          {capture.metaLabel && (
            <Text fontFamily="mono" fontSize="10px" color="#737C94" truncate>
              {capture.metaLabel}
            </Text>
          )}
        </Flex>
      </Flex>
      <Flex gap={2} alignItems="center" flexShrink={0}>
        {capture.live && (
          <Flex
            h="16px"
            px="4px"
            alignItems="center"
            rounded="4px"
            bg="#F0F4FF"
          >
            <Text
              fontFamily="mono"
              fontSize="8px"
              fontWeight="bold"
              letterSpacing="0.08px"
              color="#21509A"
            >
              LIVE
            </Text>
          </Flex>
        )}
        <Switch.Root
          size="sm"
          checked={capture.visible}
          onCheckedChange={(e: { checked: boolean }) =>
            onLayerAction({
              action: "visibility",
              payload: { id: capture.layerId, visible: e.checked },
            })
          }
          colorPalette="primary"
          aria-label={
            capture.visible
              ? `Hide ${capture.dateLabel} capture`
              : `Show ${capture.dateLabel} capture`
          }
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb bg="white" />
          </Switch.Control>
        </Switch.Root>
      </Flex>
    </Flex>
  );
}

/**
 * Mosaic preview: a single tile from the mosaic itself, with the Figma
 * "IMAGERY" caption strip on the 32px summary variant. Falls back to a plain
 * swatch when there is no URL (or the tile fails to load).
 */
function ImageryThumbnail(props: {
  src?: string;
  size: number;
  captioned?: boolean;
}) {
  const { src, size, captioned } = props;
  const [failed, setFailed] = useState(false);

  return (
    <Box
      position="relative"
      w={`${size}px`}
      h={`${size}px`}
      rounded={captioned ? "4px" : "6px"}
      overflow="hidden"
      bg="#E0E2E5"
      flexShrink={0}
    >
      {src && !failed && (
        <Image
          src={src}
          alt=""
          w="100%"
          h="100%"
          objectFit="cover"
          onError={() => setFailed(true)}
        />
      )}
      {captioned && (
        <Flex
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          h="8px"
          alignItems="center"
          justifyContent="center"
          bg="rgba(15, 27, 36, 0.8)"
        >
          <Text
            fontFamily="mono"
            fontSize="6px"
            color="white"
            letterSpacing="0.03px"
          >
            IMAGERY
          </Text>
        </Flex>
      )}
    </Box>
  );
}

/** Body shown while the agent is rebuilding the mosaic (Figma 1473:8197). */
function UpdatingBody(props: { compact?: boolean }) {
  const { compact } = props;
  return (
    <Flex
      flexDir="column"
      gap={compact ? 1.5 : 2}
      pt={compact ? 1.5 : 2}
      pr={compact ? 2 : 4}
    >
      <Flex gap={2} alignItems="center" pl={compact ? 2 : 3}>
        <Box
          w="32px"
          h="32px"
          rounded="4px"
          bg="#F4F5F6"
          border="1px solid"
          borderColor="#E0E2E5"
          flexShrink={0}
        />
        <Text fontSize="xs" color="#737C94">
          Updating mosaic…
        </Text>
      </Flex>
      <Flex
        alignItems="center"
        gap={2}
        px={2}
        py="6px"
        rounded="4px"
        bg="#F4F5F6"
      >
        <Spinner size="xs" color="#737C94" />
        <Text fontSize="10px" color="#3A4048">
          Fetching new imagery for this view…
        </Text>
      </Flex>
    </Flex>
  );
}
