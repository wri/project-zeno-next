"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Flex, SimpleGrid, Text } from "@chakra-ui/react";
import { PlusIcon } from "@phosphor-icons/react";
import type { BlockSize } from "@/app/types/portfolio";

type SortableBlockProps = {
  id: string;
  size?: BlockSize;
  children: (handle: React.HTMLAttributes<HTMLDivElement>) => React.ReactNode;
};

export function SortableBlock({
  id,
  size = "default",
  children,
}: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : "auto",
    // Wide blocks fill the whole sheet width; default blocks sit half-width
    // and pair up side-by-side.
    gridColumn: size === "wide" ? "span 2" : undefined,
    // Don't stretch a block to fill row height when its neighbour is taller —
    // each block stays at its natural size.
    alignSelf: "start",
  };

  return (
    <Box ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </Box>
  );
}

type CanvasGridProps = {
  ids: string[];
  onReorder: (orderedIds: string[]) => void;
  children: React.ReactNode;
  // Trailing placeholder (e.g. "+ Pin or drop here") rendered after the
  // sortable items. Always spans the full grid width.
  trailing?: React.ReactNode;
  // Column count for the md+ viewport. Reports stay at 2 (default blocks
  // are half-width, wide blocks span the full width). Dashboards pass 3
  // so default blocks are 1/3-width and wide blocks are 2/3-width —
  // SortableBlock keeps "wide = span 2" regardless of column count.
  columns?: 2 | 3 | 4;
  // When set, the grid renders `columns`-count of invisible filler cells
  // after the blocks. Each cell reveals a dashed border + label on hover
  // and calls onClick when activated. Used by reports/dashboards to give
  // the user an inline "Annotate here" affordance per empty slot.
  emptyCellAction?: {
    label: string;
    onClick: () => void;
  };
};

// Sortable grid layout used by both reports and dashboards. dnd-kit reorders
// via rectSortingStrategy; grid-auto-flow:row dense fills gaps that wide
// blocks would otherwise leave behind.
export default function CanvasGrid({
  ids,
  onReorder,
  children,
  trailing,
  columns = 2,
  emptyCellAction,
}: CanvasGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <SimpleGrid
          columns={{ base: 1, md: columns }}
          gap={4}
          alignItems="start"
          css={{ gridAutoFlow: "row dense" }}
        >
          {children}
          {emptyCellAction &&
            Array.from({ length: columns }).map((_, i) => (
              <EmptyCellSlot
                key={`empty-cell-${i}`}
                label={emptyCellAction.label}
                onClick={emptyCellAction.onClick}
              />
            ))}
          {trailing ? (
            <Box
              gridColumn={{ base: "span 1", md: `span ${columns}` }}
            >
              {trailing}
            </Box>
          ) : null}
        </SimpleGrid>
      </SortableContext>
    </DndContext>
  );
}

// Invisible-by-default hover target rendered into empty grid cells. Hover
// surfaces a dashed border + label; activation triggers the parent's
// addAnnotation handler.
function EmptyCellSlot({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      minH="140px"
      w="100%"
      bg="transparent"
      border="1px dashed transparent"
      rounded="md"
      cursor="pointer"
      display="flex"
      alignItems="center"
      justifyContent="center"
      color="transparent"
      transition="border-color 0.12s ease, color 0.12s ease, background 0.12s ease"
      _hover={{
        borderColor: "border.emphasized",
        color: "fg.muted",
        bg: "bg.subtle",
      }}
      _focusVisible={{
        outline: "none",
        borderColor: "primary.solid",
        color: "fg",
        bg: "bg.subtle",
      }}
      aria-label={label}
    >
      <Flex align="center" gap={1.5}>
        <PlusIcon size={14} />
        <Text fontSize="xs" fontWeight="medium">
          {label}
        </Text>
      </Flex>
    </Box>
  );
}
