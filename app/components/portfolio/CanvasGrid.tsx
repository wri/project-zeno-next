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
  // sortable items. Always spans the full grid width.
  trailing?: React.ReactNode;
  // Column count for the md+ viewport. Reports stay at 2 (default blocks
  // are half-width, wide blocks span the full width). Dashboards pass 4
  // so default blocks become quarter-width and wide blocks become
  // half-width — SortableBlock keeps "wide = span 2" either way.
  columns?: 2 | 4;
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
