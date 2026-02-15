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

  // Track which layer is expanded (by id). Default to the first layer.
  const [expandedId, setExpandedId] = useState<string | null>(
    layers[0]?.id ?? null
  );

  // When a new layer is added, expand it
  useEffect(() => {
    if (layers.length > 0) {
      const currentIds = new Set(layers.map((l) => l.id));
      // If the currently expanded layer was removed, expand the first
      if (expandedId && !currentIds.has(expandedId)) {
        setExpandedId(layers[0]?.id ?? null);
      }
    } else {
      setExpandedId(null);
    }
  }, [layers]);

  // Auto-expand newly added layers
  const [prevLayerIds, setPrevLayerIds] = useState<Set<string>>(
    new Set(layers.map((l) => l.id))
  );
  useEffect(() => {
    const currentIds = new Set(layers.map((l) => l.id));
    // Find newly added layer ids
    for (const id of currentIds) {
      if (!prevLayerIds.has(id)) {
        setExpandedId(id);
        break;
      }
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
      overflow="hidden"
      rounded="sm"
      shadow="sm"
      flexDirection="column"
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
            expanded={item.id === expandedId}
            onToggleExpand={() =>
              setExpandedId((prev) => (prev === item.id ? null : item.id))
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
