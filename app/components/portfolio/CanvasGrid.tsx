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
import { Box, SimpleGrid } from "@chakra-ui/react";
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
  // sortable items. Always spans the full sheet width.
  trailing?: React.ReactNode;
};

// Two-column sheet layout. Default blocks take half the sheet so two sit
// side-by-side; "wide" blocks span the full width. dnd-kit reorders via
// rectSortingStrategy and grid-auto-flow:row dense fills gaps wide blocks
// would otherwise leave behind.
export default function CanvasGrid({
  ids,
  onReorder,
  children,
  trailing,
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
          columns={{ base: 1, md: 2 }}
          gap={4}
          alignItems="start"
          css={{ gridAutoFlow: "row dense" }}
        >
          {children}
          {trailing ? (
            <Box gridColumn={{ base: "span 1", md: "span 2" }}>{trailing}</Box>
          ) : null}
        </SimpleGrid>
      </SortableContext>
    </DndContext>
  );
}
