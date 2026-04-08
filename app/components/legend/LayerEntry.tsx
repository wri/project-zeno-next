import {
  Flex,
  Heading,
  Text,
  ButtonGroup,
  IconButton,
  Popover,
  Portal,
  Collapsible,
} from "@chakra-ui/react";
import {
  InfoIcon,
  EyeIcon,
  EyeClosedIcon,
  XIcon,
  CircleHalfIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import { OpacityControl } from "./OpacityControl";
import type { LegendLayer, LayerActionHandler } from "./types";

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
  }
) {
  const {
    id,
    title,
    dateRange,
    symbology,
    children,
    visible,
    opacity,
    hideOpacityControl,
    hideRemoveControl,
    onLayerAction,
    info,
    expanded = false,
    onToggleExpand,
  } = props;

  return (
    <Flex flexDir="column" w="100%" minW={0} fontFamily="body" lineHeight="shorter">
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
          <Heading as="h3" size="sm" m={0} truncate>
            {title}{" "}
            {dateRange && (
              <Text as="span" fontWeight="normal" color="fg.muted">
                {dateRange}
              </Text>
            )}
          </Heading>
        </Flex>
        <ButtonGroup
          variant="ghost"
          size="xs"
          gap={0}
          flexShrink={0}
          css={{
            "& button": {
              h: 6,
              minW: 6,
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
          {!hideOpacityControl && (<OpacityControl
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
          </OpacityControl>)}
          <IconButton
            onClick={() =>
              onLayerAction({
                action: "visibility",
                payload: { id: id, visible: !visible },
              })
            }
          >
            {visible ? <EyeIcon /> : <EyeClosedIcon />}
          </IconButton>
          {!hideRemoveControl && (<IconButton
            onClick={() =>
              onLayerAction({ action: "remove", payload: { id: id } })
            }
          >
            <XIcon />
          </IconButton>)}
        </ButtonGroup>
      </Flex>

      {/* Collapsible body — symbology + notes */}
      <Collapsible.Root open={expanded}>
        <Collapsible.Content css={{ transition: "height 0.15s ease" }}>
          <Flex flexDir="column" gap={2} pt={2} pr={4}>
            {symbology}
            {children}
          </Flex>
        </Collapsible.Content>
      </Collapsible.Root>
    </Flex>
  );
}
