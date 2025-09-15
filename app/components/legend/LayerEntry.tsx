import {
  Flex,
  Heading,
  Text,
  ButtonGroup,
  IconButton,
  Popover,
  Portal,
} from "@chakra-ui/react";
import {
  InfoIcon,
  EyeIcon,
  EyeClosedIcon,
  XIcon,
  CircleHalfIcon,
} from "@phosphor-icons/react";
import { OpacityControl } from "./OpacityControl";
import type { LegendLayer, LayerActionHandler } from "./types";

/**
 * LayerEntry component displaying details, controls, and legend swatches for a
 * map layer.
 *
 * @param props - LegendLayer properties and onLayerAction callback.
 */
export function LayerEntry(
  props: LegendLayer & { onLayerAction: LayerActionHandler }
) {
  const {
    id,
    title,
    dateRange,
    symbology,
    children,
    visible,
    opacity,
    onLayerAction,
    info,
  } = props;
  return (
    <Flex flexDir="column" gap={2} pr={4} w="100%" fontFamily="body" lineHeight="shorter">
      <Flex justifyContent="space-between" gap={2} alignItems="center" mr={-4}>
        <Flex gap={1} alignItems="center" fontSize="sm">
          <Heading as="h3" size="sm" m={0}>
            {title}{" "}
            {dateRange && (
              <Text as="span" fontWeight="normal">
                {dateRange}
              </Text>
            )}
          </Heading>
        </Flex>
        <ButtonGroup
          variant="ghost"
          size="xs"
          gap={0}
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
          <IconButton
            onClick={() =>
              onLayerAction({ action: "remove", payload: { id: id } })
            }
          >
            <XIcon />
          </IconButton>
        </ButtonGroup>
      </Flex>
      {symbology}
      {children}
    </Flex>
  );
}
