"use client";

import React from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { ReportBlock as ReportBlockType } from "@/app/types/report";
import ReportBlock from "./ReportBlock";

interface Props {
  block: ReportBlockType;
  reportId: string;
  index: number;
}

function SortableBlockInner({ block, reportId, index }: Props) {
  const { ref, handleRef, isDragging } = useSortable({
    id: block.id,
    index,
  });

  const size = block.size ?? "full";

  return (
    <div
      ref={ref}
      style={{
        gridColumn: size === "full" ? "1 / -1" : "span 1",
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? "scale(0.98)" : undefined,
        transition: isDragging ? "none" : "opacity 0.15s, transform 0.15s",
      }}
    >
      <ReportBlock
        block={block}
        reportId={reportId}
        dragHandleRef={handleRef}
      />
    </div>
  );
}

const SortableBlock = React.memo(SortableBlockInner, (prev, next) => {
  return (
    prev.block.id === next.block.id &&
    prev.block.content === next.block.content &&
    prev.block.order === next.block.order &&
    prev.block.size === next.block.size &&
    prev.index === next.index &&
    prev.reportId === next.reportId
  );
});

SortableBlock.displayName = "SortableBlock";

export default SortableBlock;
