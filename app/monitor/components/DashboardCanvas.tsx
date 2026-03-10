"use client";

import { useCallback, useState } from "react";
import {
  Box,
  Grid,
  Flex,
  Button,
  Heading,
  HStack,
  Input,
  Separator,
  Text,
} from "@chakra-ui/react";
import {
  PlusIcon,
  PencilSimpleIcon,
  CheckIcon,
  XIcon,
} from "@phosphor-icons/react";
import { DragDropProvider } from "@dnd-kit/react";
import type { Report } from "@/app/types/report";
import type { Dashboard } from "@/app/types/dashboard";
import useDashboardStore from "@/app/store/dashboardStore";
import mockGenerateText from "@/app/utils/mockGenerateText";
import SortableBlock from "@/app/components/report/SortableBlock";
import ReportPromptBar from "@/app/components/report/ReportPromptBar";
import AddInsightDialog from "./AddInsightDialog";
import DashboardDataTable from "./DashboardDataTable";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  dashboard: Dashboard;
}

/** Tracks a block that is in the generative UI flow. */
interface GeneratingBlock {
  blockId: string;
  autoPrompt?: string;
  focusWidgetId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract Report-compatible fields from Dashboard for generateText calls. */
function asReport(dashboard: Dashboard): Report {
  return {
    id: dashboard.id,
    title: dashboard.title,
    blocks: dashboard.blocks,
    createdAt: dashboard.createdAt,
    updatedAt: dashboard.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardCanvas({ dashboard }: Props) {
  const {
    addBlock,
    insertBlockAfter,
    reorderBlocks,
    removeBlock,
    resizeBlock,
    updateBlockContent,
    renameDashboard,
  } = useDashboardStore();

  const sortedBlocks = [...dashboard.blocks].sort((a, b) => a.order - b.order);

  // ── Title editing ─────────────────────────────────────────────────
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(dashboard.title);

  const handleTitleSave = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== dashboard.title) {
      renameDashboard(dashboard.id, trimmed);
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTitleDraft(dashboard.title);
    setIsEditingTitle(false);
  };

  // ── Add Insight dialog ────────────────────────────────────────────
  const [showAddInsight, setShowAddInsight] = useState(false);

  // ── Generative text state ─────────────────────────────────────────
  const [generatingBlocks, setGeneratingBlocks] = useState<GeneratingBlock[]>(
    [],
  );
  const [isPromptBarGenerating, setIsPromptBarGenerating] = useState(false);

  const isBlockGenerating = (blockId: string) =>
    generatingBlocks.some((g) => g.blockId === blockId);

  const getBlockGeneratingInfo = (blockId: string) =>
    generatingBlocks.find((g) => g.blockId === blockId);

  const removeGeneratingBlock = (blockId: string) =>
    setGeneratingBlocks((prev) => prev.filter((g) => g.blockId !== blockId));

  // ── Prompt bar: Generate ──────────────────────────────────────────
  const handlePromptBarGenerate = async (prompt: string) => {
    setIsPromptBarGenerating(true);

    addBlock(dashboard.id, { kind: "text", content: "", generatedByAi: true });

    const updatedDashboard = useDashboardStore
      .getState()
      .dashboards.find((d) => d.id === dashboard.id);
    if (!updatedDashboard) {
      setIsPromptBarGenerating(false);
      return;
    }
    const newBlock =
      updatedDashboard.blocks[updatedDashboard.blocks.length - 1];

    const otherIds = updatedDashboard.blocks
      .filter((b) => b.id !== newBlock.id)
      .sort((a, b) => a.order - b.order)
      .map((b) => b.id);
    reorderBlocks(dashboard.id, [newBlock.id, ...otherIds]);

    setGeneratingBlocks((prev) => [
      ...prev,
      { blockId: newBlock.id, autoPrompt: prompt },
    ]);

    setIsPromptBarGenerating(false);
  };

  // ── Prompt bar: Add plain text block ──────────────────────────────
  const handleAddTextBlock = () => {
    addBlock(dashboard.id, { kind: "text", content: "" });
  };

  // ── Per-widget Chat ───────────────────────────────────────────────
  const handleWidgetChat = (widgetBlockId: string) => {
    const widgetBlock = dashboard.blocks.find((b) => b.id === widgetBlockId);
    if (!widgetBlock) return;

    const size = widgetBlock.size ?? "full";
    const textSize = size === "half" ? "half" : "full";

    const newBlockId = insertBlockAfter(dashboard.id, widgetBlockId, {
      kind: "text",
      content: "",
      size: textSize,
      generatedByAi: true,
    });

    setGeneratingBlocks((prev) => [
      ...prev,
      { blockId: newBlockId, focusWidgetId: widgetBlockId },
    ]);
  };

  // ── Generation handler ────────────────────────────────────────────
  const makeGenerateHandler = (blockId: string) => {
    const info = getBlockGeneratingInfo(blockId);
    return async (prompt: string): Promise<string> => {
      const report = asReport(dashboard);
      const focusWidgetId = info?.focusWidgetId ?? null;

      return mockGenerateText(report, prompt, focusWidgetId);
    };
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

      reorderBlocks(dashboard.id, newIds);
    },
    [sortedBlocks, dashboard.id, reorderBlocks],
  );

  return (
    <Box maxW="4xl" mx="auto">
      {/* Title */}
      <Box mb={4}>
        {isEditingTitle ? (
          <HStack gap={2}>
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSave();
                if (e.key === "Escape") handleTitleCancel();
              }}
              size="lg"
              fontWeight="bold"
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={handleTitleSave}>
              <CheckIcon />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleTitleCancel}>
              <XIcon />
            </Button>
          </HStack>
        ) : (
          <Flex align="center" gap={2}>
            <Heading size="xl">{dashboard.title}</Heading>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setTitleDraft(dashboard.title);
                setIsEditingTitle(true);
              }}
            >
              <PencilSimpleIcon size={14} />
            </Button>
          </Flex>
        )}
        <Text fontSize="xs" color="fg.muted" mt={1}>
          {dashboard.setupMetadata.datasetIds.length} dataset
          {dashboard.setupMetadata.datasetIds.length !== 1 ? "s" : ""},{" "}
          {dashboard.setupMetadata.areaIds.length} area
          {dashboard.setupMetadata.areaIds.length !== 1 ? "s" : ""}
        </Text>
      </Box>

      <Separator mb={4} />

      {/* Prompt bar */}
      <ReportPromptBar
        onGenerate={handlePromptBarGenerate}
        onAddTextBlock={handleAddTextBlock}
        isGenerating={isPromptBarGenerating}
        placeholder="Ask about your dashboard data…"
        isMockMode={true}
      />

      {/* Add Insight button */}
      <Flex mb={4} gap={2}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddInsight(true)}
        >
          <PlusIcon size={16} /> Add Insight
        </Button>
      </Flex>

      {/* Blocks grid */}
      <DragDropProvider onDragEnd={handleDragEnd}>
        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
          {sortedBlocks.map((block, index) => {
            const generating = isBlockGenerating(block.id);
            const info = getBlockGeneratingInfo(block.id);
            return (
              <SortableBlock
                key={block.id}
                block={block}
                reportId={dashboard.id}
                index={index}
                isGenerating={generating}
                autoPrompt={info?.autoPrompt}
                onGenerate={
                  generating ? makeGenerateHandler(block.id) : undefined
                }
                onGenerationComplete={
                  generating ? () => removeGeneratingBlock(block.id) : undefined
                }
                onChat={
                  block.kind === "insight"
                    ? () => handleWidgetChat(block.id)
                    : undefined
                }
                onRemoveBlock={removeBlock}
                onResizeBlock={resizeBlock}
                onUpdateContent={updateBlockContent}
              />
            );
          })}
        </Grid>
      </DragDropProvider>

      {/* Raw Data Table + CSV Download */}
      <DashboardDataTable dashboard={dashboard} />

      {sortedBlocks.length === 0 && (
        <Flex
          justify="center"
          py={12}
          border="1px dashed"
          borderColor="border.muted"
          rounded="md"
        >
          <Text color="fg.muted" fontSize="sm">
            No blocks yet. Use the prompt bar above or add an insight.
          </Text>
        </Flex>
      )}

      {/* Add Insight Dialog */}
      <AddInsightDialog
        dashboard={dashboard}
        isOpen={showAddInsight}
        onOpenChange={setShowAddInsight}
      />
    </Box>
  );
}
