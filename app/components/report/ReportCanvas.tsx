"use client";

import { useCallback } from "react";
import { Box, Grid, Flex, Button, Separator } from "@chakra-ui/react";
import { PlusIcon } from "@phosphor-icons/react";
import { DragDropProvider } from "@dnd-kit/react";
import { Report } from "@/app/types/report";
import useReportStore from "@/app/store/reportStore";
import SortableBlock from "./SortableBlock";
import ReportTitleBlock from "./ReportTitleBlock";

interface Props {
  report: Report;
}

export default function ReportCanvas({ report }: Props) {
  const { addBlock, reorderBlocks } = useReportStore();
  const sortedBlocks = [...report.blocks].sort((a, b) => a.order - b.order);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = useCallback(
    (event: any) => {
      const { source, target } = event.operation;
      if (!source || !target || source.id === target.id) return;

      const currentIds = sortedBlocks.map((b) => b.id);
      const sourceIdx = currentIds.indexOf(String(source.id));
      const targetIdx = currentIds.indexOf(String(target.id));

      if (sourceIdx === -1 || targetIdx === -1) return;

      const newIds = [...currentIds];
      const [moved] = newIds.splice(sourceIdx, 1);
      newIds.splice(targetIdx, 0, moved);

      reorderBlocks(report.id, newIds);
    },
    [sortedBlocks, report.id, reorderBlocks]
  );

  return (
    <Box maxW="4xl" mx="auto">
      <ReportTitleBlock report={report} />
      <Separator my={4} />

      <DragDropProvider onDragEnd={handleDragEnd}>
        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
          {sortedBlocks.map((block, index) => (
            <SortableBlock
              key={block.id}
              block={block}
              reportId={report.id}
              index={index}
            />
          ))}
        </Grid>
      </DragDropProvider>

      <Flex justify="center" mt={4}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addBlock(report.id, { kind: "text", content: "" })}
        >
          <PlusIcon /> Add text block
        </Button>
      </Flex>
    </Box>
  );
}
