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
 * legend details.
 *
 * @param props.layers - Array of LegendLayer objects to display.
 */
export function Legend(props: LegendProps) {
  const { layers, onLayerAction } = props;

  if (!layers.length) return null;

  return (
    <Flex
      position="absolute"
      right={3}
      bottom={{ base: "4.5rem", md: 12 }}
      zIndex={100}
      width={320}
      bg="bg"
      overflow="hidden"
      rounded="sm"
      shadow="sm"
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
      >
        {layers.map((item) => (
          <Item
            key={item.id}
            item={item}
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
function Item(props: { item: LegendLayer; onLayerAction: LayerActionHandler }) {
  const { item, onLayerAction } = props;
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
      <LayerEntry {...item} onLayerAction={onLayerAction} />
    </ChReorderItem>
  );
}
