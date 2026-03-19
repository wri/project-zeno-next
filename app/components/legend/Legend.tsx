import { useEffect, useState } from "react";
import {
  Flex,
  Heading,
  VisuallyHidden,
  IconButton,
  chakra,
} from "@chakra-ui/react";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import { Reorder, useDragControls } from "motion/react";

import { LayerActionHandler, LegendLayer } from "./types";
import { LayerEntry } from "./LayerEntry";

const ChReorderGroup = chakra(Reorder.Group);
const ChReorderItem = chakra(Reorder.Item);

/**
 * Props for the Legend component.
 */
interface LegendProps {
  layers: LegendLayer[];
  onLayerAction?: LayerActionHandler;
}

/**
 * Legend component displaying a draggable, reorderable list of map layers with
 * accordion-style expand/collapse. Only one layer is expanded at a time.
 *
 * @param props.layers - Array of LegendLayer objects to display.
 */
export function Legend(props: LegendProps) {
  const { layers, onLayerAction } = props;

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

  if (!layers.length) return null;

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
      <VisuallyHidden>
        <Heading>Map Legend</Heading>
      </VisuallyHidden>
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
        flex={1}
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
