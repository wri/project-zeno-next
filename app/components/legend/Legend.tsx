import { useEffect, useState } from "react";
import {
  Flex,
  Box,
  Text,
  IconButton,
  chakra,
  Collapsible,
} from "@chakra-ui/react";
import {
  DotsSixVerticalIcon,
  StackIcon,
  CaretDownIcon,
  CaretUpIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Reorder, useDragControls } from "motion/react";

import { LayerActionHandler, LegendLayer } from "./types";
import type { LegendAoi } from "./useLegendHook";
import { LayerEntry } from "./LayerEntry";

const ChReorderGroup = chakra(Reorder.Group);
const ChReorderItem = chakra(Reorder.Item);

/**
 * Props for the Legend component.
 */
interface LegendProps {
  layers: LegendLayer[];
  onLayerAction?: LayerActionHandler;
  aois?: LegendAoi[];
  onRemoveAoi?: (contextId: string) => void;
}

/**
 * Legend component displaying a draggable, reorderable list of map layers with
 * accordion-style expand/collapse. Only one layer is expanded at a time.
 *
 * @param props.layers - Array of LegendLayer objects to display.
 */
export function Legend(props: LegendProps) {
  const { layers, onLayerAction, aois, onRemoveAoi } = props;

  // Controls whether the whole legend body is collapsed to just the header.
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Track which layers are expanded (multiple can be open).
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [prevLayerIds, setPrevLayerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(layers.map((l) => l.id));

    // Detect newly added layers
    const newIds = [...currentIds].filter((id) => !prevLayerIds.has(id));
    if (newIds.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        // When adding a layer would result in ≥3 total layers, collapse
        // existing items so only the new one is expanded.
        if (currentIds.size >= 3) {
          next.clear();
        }
        // Expand each newly added layer
        for (const id of newIds) {
          next.add(id);
        }
        return next;
      });
    } else {
      // Remove expanded ids for layers that were removed
      setExpandedIds((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const id of prev) {
          if (!currentIds.has(id)) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      // If nothing is expanded and there are layers, expand the last one
      setExpandedIds((prev) => {
        if (prev.size === 0 && layers.length > 0) {
          return new Set([layers[layers.length - 1].id]);
        }
        return prev;
      });
    }

    setPrevLayerIds(currentIds);
  }, [layers]);

  const hasAois = !!aois && aois.length > 0;
  if (!layers.length && !hasAois) return null;

  return (
    <Flex
      position="absolute"
      right={3}
      bottom={{ base: "4.5rem", md: 12 }}
      zIndex={100}
      width={320}
      maxH={{ base: "50vh", md: "60vh" }}
      bg="bg"
      rounded="sm"
      shadow="sm"
      flexDirection="column"
      overflow="hidden"
    >
      {/* Always-visible header — click the caret to collapse/expand */}
      <Flex
        px={3}
        py={2}
        alignItems="center"
        justifyContent="space-between"
        borderBottom="1px solid"
        borderColor="border"
        flexShrink={0}
      >
        {/* Icon + label group (matches Figma: width 83, height 16, gap 8px) */}
        <Flex alignItems="center" gap={2}>
          <StackIcon size={12} color="#0049AA" />
          <Text
            fontSize="10px"
            fontWeight="400"
            fontFamily="mono"
            letterSpacing="wider"
            textTransform="uppercase"
            color="fg.muted"
          >
            Map layers
          </Text>
        </Flex>
        <IconButton
          variant="ghost"
          size="xs"
          p={0}
          minW="16px"
          h="16px"
          aria-label={isCollapsed ? "Expand legend" : "Collapse legend"}
          onClick={() => setIsCollapsed((prev) => !prev)}
        >
          {isCollapsed ? (
            <CaretDownIcon size={12} />
          ) : (
            <CaretUpIcon size={12} />
          )}
        </IconButton>
      </Flex>

      {/* Collapsible body — animates height on open/close */}
      <Collapsible.Root open={!isCollapsed}>
        <Collapsible.Content>
          {layers.length > 0 && (
            <ChReorderGroup
              axis="y"
              values={layers}
              onReorder={(layers: LegendLayer[]) =>
                onLayerAction?.({ action: "reorder", payload: { layers } })
              }
              listStyleType="none"
              fontSize="xs"
              p={0}
              m={0}
              w="100%"
              overflowY="auto"
              maxH="200px"
            >
              {layers.map((item) => (
                <Item
                  key={item.id}
                  item={item}
                  expanded={expandedIds.has(item.id)}
                  onToggleExpand={() =>
                    setExpandedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) {
                        next.delete(item.id);
                      } else {
                        next.add(item.id);
                      }
                      return next;
                    })
                  }
                  onLayerAction={(details) => onLayerAction?.(details)}
                />
              ))}
            </ChReorderGroup>
          )}
          {hasAois && (
            <>
              {layers.length > 0 && <Box h="1px" bg="border" />}
              <Flex gap={1} flexWrap="wrap" p={2}>
                {aois.map((aoi) => (
                  <Flex
                    key={`${aoi.contextId}-${aoi.name}`}
                    alignItems="center"
                    gap="4px"
                    h="20px"
                    pl="6px"
                    pr="4px"
                    borderRadius="sm"
                    border="1px solid"
                    borderColor="#E0E2E5"
                    fontFamily="mono"
                    fontSize="10px"
                    flexShrink={0}
                  >
                    <Text
                      as="span"
                      fontWeight="normal"
                      lineHeight="16px"
                      letterSpacing="0.5px"
                      color="#A51EC7"
                    >
                      AREA
                    </Text>
                    <Text
                      as="span"
                      fontWeight="500"
                      lineHeight="16px"
                      letterSpacing="0"
                    >
                      {aoi.name}
                    </Text>
                    <IconButton
                      variant="ghost"
                      size="xs"
                      p={0}
                      minW="12px"
                      h="12px"
                      aria-label={`Remove ${aoi.name}`}
                      onClick={() => onRemoveAoi?.(aoi.contextId)}
                    >
                      <XIcon size={10} />
                    </IconButton>
                  </Flex>
                ))}
              </Flex>
            </>
          )}
        </Collapsible.Content>
      </Collapsible.Root>
    </Flex>
  );
}

/**
 * Item component representing a single draggable/reorderable layer entry in the
 * legend.
 */
function Item(props: {
  item: LegendLayer;
  expanded: boolean;
  onToggleExpand: () => void;
  onLayerAction: LayerActionHandler;
}) {
  const { item, expanded, onToggleExpand, onLayerAction } = props;
  const dragControls = useDragControls();

  return (
    <ChReorderItem
      value={item}
      id={item}
      dragListener={false}
      dragControls={dragControls}
      p={2}
      pl={1}
      display="flex"
      gap={1}
      bg="bg"
      borderBottom="1px solid"
      borderColor="border"
      _last={{ borderBottom: "none" }}
    >
      <IconButton
        variant="ghost"
        size="xs"
        p={0}
        minW="18px"
        h="18px"
        mt="2px"
        cursor="grab"
        onPointerDown={(event) => dragControls.start(event)}
      >
        <DotsSixVerticalIcon />
      </IconButton>
      <LayerEntry
        {...item}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        onLayerAction={onLayerAction}
      />
    </ChReorderItem>
  );
}
