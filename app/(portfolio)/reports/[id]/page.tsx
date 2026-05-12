"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import {
  Box,
  Flex,
  Text,
  Input,
  Button,
  VStack,
  HStack,
  IconButton,
  Editable,
} from "@chakra-ui/react";
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilSimpleIcon,
  DownloadSimpleIcon,
  MapPinIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import useInsightStore from "@/app/store/insightStore";
import useReportStore from "@/app/store/reportStore";
import InsightBlock from "@/app/components/portfolio/InsightBlock";
import AnnotationBlock from "@/app/components/portfolio/AnnotationBlock";
import MapBlock from "@/app/components/portfolio/MapBlock";
import AddMapDialog from "@/app/components/portfolio/AddMapDialog";
import InsightCard from "@/app/components/portfolio/InsightCard";
import CanvasGrid, {
  SortableBlock,
} from "@/app/components/portfolio/CanvasGrid";
import { REPORT_INSIGHT_LIMIT } from "@/app/types/portfolio";

export default function ReportCanvasPage() {
  const params = useParams();
  const id = String(params?.id ?? "");

  const insights = useInsightStore((s) => s.insights);
  const seedIfEmpty = useInsightStore((s) => s.seedIfEmpty);
  const insightsHydrated = useInsightStore((s) => s.hasHydrated);
  const reportsHydrated = useReportStore((s) => s.hasHydrated);
  const reports = useReportStore((s) => s.reports);
  const renameReport = useReportStore((s) => s.renameReport);
  const addInsightBlock = useReportStore((s) => s.addInsightBlock);
  const addAnnotationBlock = useReportStore((s) => s.addAnnotationBlock);
  const addMapBlock = useReportStore((s) => s.addMapBlock);
  const updateAnnotation = useReportStore((s) => s.updateAnnotation);
  const resizeBlock = useReportStore((s) => s.resizeBlock);
  const removeBlock = useReportStore((s) => s.removeBlock);
  const reorderBlocks = useReportStore((s) => s.reorderBlocks);

  const [sidebarSearch, setSidebarSearch] = useState("");
  const [mapDialogOpen, setMapDialogOpen] = useState(false);

  useEffect(() => {
    if (insightsHydrated) seedIfEmpty();
  }, [insightsHydrated, seedIfEmpty]);

  const report = useMemo(
    () => reports.find((r) => r.id === id),
    [reports, id]
  );

  // Insight lookup keyed by id (some block insight ids may not exist if data
  // was cleared — we render a placeholder block in that case below).
  const insightById = useMemo(() => {
    const map = new Map(insights.map((i) => [i.id, i]));
    return map;
  }, [insights]);

  const pinnedInsightIds = useMemo(() => {
    if (!report) return new Set<string>();
    return new Set(
      report.blocks
        .filter((b) => b.type === "insight" && b.insightId)
        .map((b) => b.insightId as string)
    );
  }, [report]);

  const sidebarInsights = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    return insights.filter((i) => {
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.aoi.name.toLowerCase().includes(q) ||
        (i.datasetName ?? "").toLowerCase().includes(q)
      );
    });
  }, [insights, sidebarSearch]);

  if (reportsHydrated && !report) return notFound();
  if (!report) return null; // wait for hydration

  const insightBlockCount = report.blocks.filter(
    (b) => b.type === "insight"
  ).length;

  return (
    <Box display="grid" gridTemplateColumns="260px 1fr" minH="calc(100vh - 56px)">
      {/* Left inbox sidebar */}
      <Box
        bg="bg"
        borderRight="1px solid"
        borderColor="border"
        p={3}
        overflowY="auto"
        maxH="calc(100vh - 56px)"
      >
        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize="sm" fontWeight="semibold">
            Insight Inbox
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {insightBlockCount} of {REPORT_INSIGHT_LIMIT}
          </Text>
        </Flex>
        <Input
          placeholder="Search…"
          size="xs"
          value={sidebarSearch}
          onChange={(e) => setSidebarSearch(e.target.value)}
          mb={2}
        />
        <VStack align="stretch" gap={1.5}>
          {sidebarInsights.length === 0 && (
            <Text fontSize="xs" color="fg.muted" px={2} py={4}>
              No insights match.
            </Text>
          )}
          {sidebarInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              variant="compact"
              pinDisabled={pinnedInsightIds.has(insight.id)}
              onPinToCanvas={() => addInsightBlock(report.id, insight.id)}
            />
          ))}
        </VStack>
      </Box>

      {/* Main canvas */}
      <Box
        overflowY="auto"
        maxH="calc(100vh - 56px)"
        bg="bg.subtle"
        p={{ base: 4, md: 6 }}
      >
        <Box
          maxW="820px"
          mx="auto"
          bg="bg"
          rounded="md"
          boxShadow="md"
          p={{ base: 5, md: 8 }}
        >
        <Flex justify="space-between" align="flex-start" gap={4} flexWrap="wrap" mb={4}>
          <Box minW={0}>
            <HStack gap={2} mb={1}>
              <Button
                size="xs"
                variant="ghost"
                asChild
              >
                <Link href="/reports">
                  <ArrowLeftIcon size={14} />
                  Reports
                </Link>
              </Button>
            </HStack>
            <Editable.Root
              defaultValue={report.name}
              onValueCommit={(d) => renameReport(report.id, d.value)}
              activationMode="focus"
            >
              <Editable.Preview
                fontSize="xl"
                fontWeight="semibold"
                fontFamily="heading"
                px={1}
                rounded="sm"
                _hover={{ bg: "bg.muted" }}
              />
              <Editable.Input
                fontSize="xl"
                fontWeight="semibold"
                fontFamily="heading"
                px={1}
              />
              <Editable.Control>
                <Editable.EditTrigger asChild>
                  <IconButton
                    aria-label="Rename"
                    size="2xs"
                    variant="ghost"
                  >
                    <PencilSimpleIcon size={12} />
                  </IconButton>
                </Editable.EditTrigger>
              </Editable.Control>
            </Editable.Root>
            <Text fontSize="xs" color="fg.muted" mt={1}>
              {report.blocks.length} block
              {report.blocks.length === 1 ? "" : "s"} · drag blocks to
              reposition
            </Text>
          </Box>
          <HStack>
            <Button
              size="xs"
              variant="outline"
              onClick={() => addAnnotationBlock(report.id)}
            >
              <PlusIcon size={12} />
              Add annotation
            </Button>
            <Button
              size="xs"
              variant="outline"
              colorPalette="green"
              onClick={() => setMapDialogOpen(true)}
            >
              <MapPinIcon size={12} />
              Add map
            </Button>
            <Button
              size="xs"
              variant="outline"
              disabled
              title="Coming soon"
            >
              <DownloadSimpleIcon size={12} />
              Export PDF
            </Button>
          </HStack>
        </Flex>

        {report.blocks.length === 0 ? (
          <Box
            border="1px dashed"
            borderColor="border"
            rounded="md"
            p={10}
            textAlign="center"
            color="fg.muted"
          >
            Pin insights from the sidebar, or add an annotation to start.
          </Box>
        ) : (
          <CanvasGrid
            ids={report.blocks.map((b) => b.id)}
            onReorder={(ids) => reorderBlocks(report.id, ids)}
            trailing={
              <Box
                onClick={() => addAnnotationBlock(report.id)}
                cursor="pointer"
                bg="bg.subtle"
                border="1.5px dashed"
                borderColor="border"
                rounded="md"
                py={3}
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="fg.muted"
                fontSize="xs"
                _hover={{ borderColor: "primary.solid", color: "primary.fg" }}
              >
                + Add annotation
              </Box>
            }
          >
            {report.blocks.map((block) => (
              <SortableBlock
                key={block.id}
                id={block.id}
                size={block.size ?? "default"}
              >
                {(handle) => {
                  if (block.type === "annotation") {
                    return (
                      <AnnotationBlock
                        text={block.text ?? ""}
                        onChange={(text) =>
                          updateAnnotation(report.id, block.id, text)
                        }
                        onRemove={() => removeBlock(report.id, block.id)}
                        dragHandleProps={handle}
                        workspace={report}
                        blockId={block.id}
                        size={block.size ?? "default"}
                        onResize={(s) =>
                          resizeBlock(report.id, block.id, s)
                        }
                      />
                    );
                  }
                  if (block.type === "map" && block.aoi) {
                    return (
                      <MapBlock
                        aoi={block.aoi}
                        onRemove={() => removeBlock(report.id, block.id)}
                        dragHandleProps={handle}
                        size={block.size ?? "default"}
                        onResize={(s) =>
                          resizeBlock(report.id, block.id, s)
                        }
                      />
                    );
                  }
                  const insight = block.insightId
                    ? insightById.get(block.insightId)
                    : undefined;
                  if (!insight) {
                    return (
                      <Box
                        bg="bg"
                        border="1px solid"
                        borderColor="border"
                        rounded="md"
                        p={3}
                        h="160px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        color="fg.muted"
                        fontSize="xs"
                      >
                        Insight unavailable
                      </Box>
                    );
                  }
                  return (
                    <InsightBlock
                      insight={insight}
                      onRemove={() => removeBlock(report.id, block.id)}
                      dragHandleProps={handle}
                      size={block.size ?? "default"}
                      onResize={(s) =>
                        resizeBlock(report.id, block.id, s)
                      }
                    />
                  );
                }}
              </SortableBlock>
            ))}
          </CanvasGrid>
        )}
        </Box>
      </Box>

      <AddMapDialog
        open={mapDialogOpen}
        onClose={() => setMapDialogOpen(false)}
        onPick={(aoi) => addMapBlock(report.id, aoi)}
      />
    </Box>
  );
}
