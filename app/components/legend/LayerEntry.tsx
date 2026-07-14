import {
  Flex,
  Heading,
  Text,
  Box,
  ButtonGroup,
  IconButton,
  Popover,
  Portal,
  Collapsible,
} from "@chakra-ui/react";
import {
  InfoIcon,
  XIcon,
  CircleHalfIcon,
  CaretDownIcon,
  ArrowBendDownRightIcon,
} from "@phosphor-icons/react";
import { OpacityControl } from "./OpacityControl";
import type {
  LegendLayer,
  LegendContextLayer,
  LayerActionHandler,
} from "./types";
import { ParamChip } from "@/app/components/ui/ParamChip";

/**
 * LayerEntry component displaying details, controls, and legend swatches for a
 * map layer. Accordion-style: collapsed shows title + controls, expanded shows
 * symbology and notes.
 *
 * @param props - LegendLayer properties and onLayerAction callback.
 */
export function LayerEntry(
  props: LegendLayer & {
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
    params,
    contextLayer,
    symbology,
    children,
    opacity,
    hideOpacityControl,
    hideRemoveControl,
    onLayerAction,
    info,
    expanded = false,
    onToggleExpand,
    compact,
  } = props;

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
        {/* Clickable title area to toggle accordion */}
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
          {!hideOpacityControl && (
            <OpacityControl
              value={opacity}
              onValueChange={(value) =>
                onLayerAction({
                  action: "opacity",
                  payload: { id: id, opacity: value },
                })
              }
            >
              <IconButton>
                <CircleHalfIcon />
              </IconButton>
            </OpacityControl>
          )}
          {!hideRemoveControl && (
            <IconButton
              onClick={() =>
                onLayerAction({ action: "remove", payload: { id: id } })
              }
            >
              <XIcon />
            </IconButton>
          )}
        </ButtonGroup>
      </Flex>

      {/* Collapsible body — symbology → params → within → notes */}
      <Collapsible.Root open={expanded}>
        <Collapsible.Content css={{ transition: "height 0.15s ease" }}>
          <Flex
            flexDir="column"
            gap={compact ? 1.5 : 2}
            pt={compact ? 1.5 : 2}
            pr={compact ? 2 : 4}
          >
            {symbology}
            {params && params.length > 0 && (
              <Flex gap={1} flexWrap="wrap" alignItems="center">
                {params.map((p) => (
                  <ParamChip
                    key={p.label}
                    label={p.label}
                    value={p.value}
                    colorScheme="purple"
                    {...(p.maxValueWidth
                      ? { maxValueWidth: p.maxValueWidth }
                      : {})}
                  />
                ))}
              </Flex>
            )}
            {contextLayer && (
              <ContextLayerRow
                contextLayer={contextLayer}
                onLayerAction={onLayerAction}
              />
            )}
            {children}
          </Flex>
        </Collapsible.Content>
      </Collapsible.Root>
    </Flex>
  );
}

/**
 * Indented "within" row shown inside an expanded layer card when a contextual
 * sub-layer is active. e.g. "↳ within ■ Primary Forests (2001)"
 */
function ContextLayerRow(props: {
  contextLayer: LegendContextLayer;
  onLayerAction: LayerActionHandler;
}) {
  const { contextLayer, onLayerAction } = props;

  return (
    <Flex flexDir="column" gap={1}>
      <Box h="1px" bg="border" mx={-4} />
      <Flex alignItems="center" gap={1.5} pl={3}>
        <ArrowBendDownRightIcon
          size={12}
          color="var(--chakra-colors-fg-muted)"
        />
        <Text fontSize="xs" color="fg.muted" fontStyle="italic" flexShrink={0}>
          within
        </Text>
        {/* Colour swatch */}
        <Box
          w="10px"
          h="10px"
          borderRadius="2px"
          bg={contextLayer.color}
          flexShrink={0}
        />
        <Text fontSize="xs" truncate flex={1}>
          {contextLayer.title}
        </Text>
        <ButtonGroup
          variant="ghost"
          size="xs"
          gap={0}
          flexShrink={0}
          css={{ "& button": { h: 5, minW: 5 } }}
        >
          {contextLayer.info && (
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
                      <Text my="4">{contextLayer.info}</Text>
                    </Popover.Body>
                  </Popover.Content>
                </Popover.Positioner>
              </Portal>
            </Popover.Root>
          )}
          <OpacityControl
            value={contextLayer.opacity}
            onValueChange={(value) =>
              onLayerAction({
                action: "opacity",
                payload: { id: contextLayer.id, opacity: value },
              })
            }
          >
            <IconButton>
              <CircleHalfIcon />
            </IconButton>
          </OpacityControl>
        </ButtonGroup>
      </Flex>
    </Flex>
  );
}
