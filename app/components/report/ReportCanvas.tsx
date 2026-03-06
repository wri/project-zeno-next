"use client";

import { useCallback, useState } from "react";
import { Box, Grid, Flex, Button, Separator, Spinner } from "@chakra-ui/react";
import { FilePdfIcon } from "@phosphor-icons/react";
import { toaster } from "@/app/components/ui/toaster";
import type { PdfExportPhase } from "@/app/utils/generateReportPdf";
import { DragDropProvider } from "@dnd-kit/react";
import { Report } from "@/app/types/report";
import useReportStore from "@/app/store/reportStore";
import mockGenerateText from "@/app/utils/mockGenerateText";
import SortableBlock from "./SortableBlock";
import ReportTitleBlock from "./ReportTitleBlock";
import ReportPromptBar from "./ReportPromptBar";

interface Props {
  report: Report;
}

/** Tracks a block that is in the generative UI flow. */
interface GeneratingBlock {
  blockId: string;
  /** The prompt to auto-run (set when created via per-widget chat). */
  autoPrompt?: string;
  /** The widget ID this text block is focused on (for per-widget chat). */
  focusWidgetId?: string;
}

export default function ReportCanvas({ report }: Props) {
  const { addBlock, insertBlockAfter, reorderBlocks } = useReportStore();
  const sortedBlocks = [...report.blocks].sort((a, b) => a.order - b.order);

  const [exportStatus, setExportStatus] = useState<PdfExportPhase | null>(null);
  const isExporting = exportStatus !== null;

  // ── Generative text state ──────────────────────────────────────────
  const [generatingBlocks, setGeneratingBlocks] = useState<GeneratingBlock[]>(
    []
  );
  const [isPromptBarGenerating, setIsPromptBarGenerating] = useState(false);

  const isBlockGenerating = (blockId: string) =>
    generatingBlocks.some((g) => g.blockId === blockId);

  const getBlockGeneratingInfo = (blockId: string) =>
    generatingBlocks.find((g) => g.blockId === blockId);

  const removeGeneratingBlock = (blockId: string) =>
    setGeneratingBlocks((prev) => prev.filter((g) => g.blockId !== blockId));

  // ── Prompt bar: Generate ───────────────────────────────────────────
  const handlePromptBarGenerate = async (prompt: string) => {
    setIsPromptBarGenerating(true);

    // Add a text block at the top of the report (order 0)
    // We use addBlock which appends, then reorder to put it first.
    addBlock(report.id, { kind: "text", content: "", generatedByAi: true });

    // The new block is the last one added — find it
    const updatedReport = useReportStore.getState().reports.find(
      (r) => r.id === report.id
    );
    if (!updatedReport) {
      setIsPromptBarGenerating(false);
      return;
    }
    const newBlock = updatedReport.blocks[updatedReport.blocks.length - 1];

    // Move it to the top
    const otherIds = updatedReport.blocks
      .filter((b) => b.id !== newBlock.id)
      .sort((a, b) => a.order - b.order)
      .map((b) => b.id);
    reorderBlocks(report.id, [newBlock.id, ...otherIds]);

    // Track as generating with auto-prompt
    setGeneratingBlocks((prev) => [
      ...prev,
      { blockId: newBlock.id, autoPrompt: prompt },
    ]);

    setIsPromptBarGenerating(false);
  };

  // ── Prompt bar: Add plain text block ──────────────────────────────
  const handleAddTextBlock = () => {
    addBlock(report.id, { kind: "text", content: "" });
  };

  // ── Per-widget Chat ───────────────────────────────────────────────
  const handleWidgetChat = (widgetBlockId: string) => {
    const widgetBlock = report.blocks.find((b) => b.id === widgetBlockId);
    if (!widgetBlock) return;

    const size = widgetBlock.size ?? "full";
    const textSize = size === "half" ? "half" : "full";

    const newBlockId = insertBlockAfter(report.id, widgetBlockId, {
      kind: "text",
      content: "",
      size: textSize,
      generatedByAi: true,
    });

    // Track as generating — the GenerativeTextBlock will show the input phase
    setGeneratingBlocks((prev) => [
      ...prev,
      { blockId: newBlockId, focusWidgetId: widgetBlockId },
    ]);
  };

  // ── Generation handler (passed to GenerativeTextBlock) ─────────────
  const makeGenerateHandler = (blockId: string) => {
    const info = getBlockGeneratingInfo(blockId);
    return async (prompt: string): Promise<string> => {
      return mockGenerateText(report, prompt, info?.focusWidgetId ?? null);
    };
  };

  // ── PDF Export ────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    try {
      const { default: generateReportPdf } = await import(
        "@/app/utils/generateReportPdf"
      );
      await generateReportPdf(report, setExportStatus);
    } catch (err) {
      toaster.create({
        type: "error",
        title: "PDF export failed",
        description: String(err),
      });
    } finally {
      setExportStatus(null);
    }
  };

  // ── Drag-and-drop ─────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      {/* Prompt bar */}
      <ReportPromptBar
        onGenerate={handlePromptBarGenerate}
        onAddTextBlock={handleAddTextBlock}
        isGenerating={isPromptBarGenerating}
        isMockMode={true}
      />

      <DragDropProvider onDragEnd={handleDragEnd}>
        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
          {sortedBlocks.map((block, index) => {
            const generating = isBlockGenerating(block.id);
            const info = getBlockGeneratingInfo(block.id);
            return (
              <SortableBlock
                key={block.id}
                block={block}
                reportId={report.id}
                index={index}
                isGenerating={generating}
                autoPrompt={info?.autoPrompt}
                onGenerate={
                  generating ? makeGenerateHandler(block.id) : undefined
                }
                onGenerationComplete={
                  generating
                    ? () => removeGeneratingBlock(block.id)
                    : undefined
                }
                onChat={
                  block.kind === "insight"
                    ? () => handleWidgetChat(block.id)
                    : undefined
                }
              />
            );
          })}
        </Grid>
      </DragDropProvider>

      {/* Bottom bar — PDF export only (Add text block moved to prompt bar) */}
      <Flex justify="center" mt={4} gap={2}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          disabled={isExporting || report.blocks.length === 0}
        >
          {exportStatus?.phase === "rasterising" ? (
            <>
              <Spinner size="xs" />
              Rasterising charts ({exportStatus.current}/{exportStatus.total})…
            </>
          ) : exportStatus?.phase === "generating" ? (
            <>
              <Spinner size="xs" />
              Generating PDF…
            </>
          ) : (
            <>
              <FilePdfIcon /> Export PDF
            </>
          )}
        </Button>
      </Flex>
    </Box>
  );
}
