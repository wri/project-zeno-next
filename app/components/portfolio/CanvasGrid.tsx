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
    // Wide blocks span 2 of the 3 columns on md+. On sm the grid is 2 cols
    // so wide becomes full-width; on base the grid is 1 col so the span is
    // naturally capped.
    gridColumn: size === "wide" ? "span 2" : undefined,
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
  // Allow callers to extend the grid with a trailing placeholder
  // (e.g. "+ Pin or drop here") that is NOT part of the sortable list.
  trailing?: React.ReactNode;
};

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
          columns={{ base: 1, sm: 2, md: 3 }}
          gap={3}
          css={{ gridAutoFlow: "row dense" }}
        >
          {children}
          {trailing}
        </SimpleGrid>
      </SortableContext>
    </DndContext>
  );
}
