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
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Stack } from "@chakra-ui/react";

type SortableBlockProps = {
  id: string;
  children: (handle: React.HTMLAttributes<HTMLDivElement>) => React.ReactNode;
};

export function SortableBlock({ id, children }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : "auto",
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
  // Allow callers to extend the list with a trailing placeholder
  // (e.g. "+ Pin or drop here") that is NOT part of the sortable list.
  trailing?: React.ReactNode;
};

// Page-style vertical sortable list. Each block flows at its natural
// height so chart blocks aren't clipped by a uniform grid row.
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
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <Stack gap={4}>
          {children}
          {trailing}
        </Stack>
      </SortableContext>
    </DndContext>
  );
}
