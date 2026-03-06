"use client";

import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ReportBlock as ReportBlockType } from "@/app/types/report";
import BlockToolbar from "./BlockToolbar";
import ReportTextBlock from "./ReportTextBlock";
import ReportInsightBlock from "./ReportInsightBlock";

interface Props {
  block: ReportBlockType;
  reportId: string;
  /** Ref callback from useSortable for the drag handle */
  dragHandleRef?: (element: Element | null) => void;
}

export default function ReportBlock({ block, reportId, dragHandleRef }: Props) {
  const [hovered, setHovered] = useState(false);

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
      <BlockToolbar
        block={block}
        reportId={reportId}
        dragHandleRef={dragHandleRef}
        visible={hovered}
      />

      {block.kind === "text" && (
        <Box px={2}>
          <ReportTextBlock block={block} reportId={reportId} />
        </Box>
      )}
      {block.kind === "insight" && block.widget && (
        <Box px={2}>
          <ReportInsightBlock widget={block.widget} />
        </Box>
      )}
    </Box>
  );
}
