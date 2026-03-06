"use client";

import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ReportBlock as ReportBlockType } from "@/app/types/report";
import BlockToolbar from "./BlockToolbar";
import ReportTextBlock from "./ReportTextBlock";
import ReportInsightBlock from "./ReportInsightBlock";
import GenerativeTextBlock from "./GenerativeTextBlock";

interface Props {
  block: ReportBlockType;
  reportId: string;
  /** Ref callback from useSortable for the drag handle */
  dragHandleRef?: (element: Element | null) => void;
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

export default function ReportBlock({
  block,
  reportId,
  dragHandleRef,
  isGenerating,
  autoPrompt,
  onGenerate,
  onGenerationComplete,
  onChat,
  onRemoveBlock,
  onResizeBlock,
  onUpdateContent,
}: Props) {
  const [hovered, setHovered] = useState(false);

  const showGenerativeUI =
    isGenerating && block.kind === "text" && !block.content && onGenerate;

  return (
    <Box
      position="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      rounded="md"
      outline={hovered ? "1px solid" : "1px solid transparent"}
      outlineColor={hovered ? "border.muted" : "transparent"}
      transition="outline-color 0.15s"
      pb={1}
    >
      {/* Toolbar rendered in-flow above the content */}
      {!showGenerativeUI && (
        <BlockToolbar
          block={block}
          reportId={reportId}
          dragHandleRef={dragHandleRef}
          visible={hovered}
          onChat={onChat}
          onRemoveBlock={onRemoveBlock}
          onResizeBlock={onResizeBlock}
        />
      )}

      {showGenerativeUI ? (
        <Box px={2} py={2}>
          <GenerativeTextBlock
            block={block}
            reportId={reportId}
            autoGenerate={!!autoPrompt}
            autoPrompt={autoPrompt}
            onGenerate={onGenerate}
            onGenerationComplete={onGenerationComplete}
            onUpdateContent={onUpdateContent}
          />
        </Box>
      ) : block.kind === "text" ? (
        <Box px={2}>
          <ReportTextBlock
            block={block}
            reportId={reportId}
            onUpdateContent={onUpdateContent}
          />
        </Box>
      ) : block.kind === "insight" && block.widget ? (
        <Box px={2}>
          <ReportInsightBlock widget={block.widget} />
        </Box>
      ) : null}
    </Box>
  );
}
