"use client";

import React from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { ReportBlock as ReportBlockType } from "@/app/types/report";
import ReportBlock from "./ReportBlock";

interface Props {
  block: ReportBlockType;
  reportId: string;
  index: number;
  /** Whether this block is currently in AI generation mode */
  isGenerating?: boolean;
  /** The auto-prompt to generate with (for per-widget chat) */
  autoPrompt?: string;
  /** Called with a prompt; parent handles mock generation and returns text. */
  onGenerate?: (prompt: string) => Promise<string>;
  /** Called when generation completes */
  onGenerationComplete?: () => void;
  /** Called when user clicks "Chat" on an insight block */
  onChat?: () => void;
  /** Store action overrides for dashboard reuse */
  onRemoveBlock?: (reportId: string, blockId: string) => void;
  onResizeBlock?: (
    reportId: string,
    blockId: string,
    size: "full" | "half",
  ) => void;
  onUpdateContent?: (
    reportId: string,
    blockId: string,
    content: string,
  ) => void;
}

function SortableBlockInner({
  block,
  reportId,
  index,
  isGenerating,
  autoPrompt,
  onGenerate,
  onGenerationComplete,
  onChat,
  onRemoveBlock,
  onResizeBlock,
  onUpdateContent,
}: Props) {
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
        isGenerating={isGenerating}
        autoPrompt={autoPrompt}
        onGenerate={onGenerate}
        onGenerationComplete={onGenerationComplete}
        onChat={onChat}
        onRemoveBlock={onRemoveBlock}
        onResizeBlock={onResizeBlock}
        onUpdateContent={onUpdateContent}
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
    prev.block.generatedByAi === next.block.generatedByAi &&
    prev.index === next.index &&
    prev.reportId === next.reportId &&
    prev.isGenerating === next.isGenerating &&
    prev.autoPrompt === next.autoPrompt
  );
});

SortableBlock.displayName = "SortableBlock";

export default SortableBlock;
