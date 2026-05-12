"use client";

import { useMemo, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  HStack,
  Badge,
} from "@chakra-ui/react";
import { ArrowLeftIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import useInsightStore from "@/app/store/insightStore";
import useDashboardStore from "@/app/store/dashboardStore";
import InsightBlock from "@/app/components/portfolio/InsightBlock";
import AnnotationBlock from "@/app/components/portfolio/AnnotationBlock";
import CanvasGrid, {
  SortableBlock,
} from "@/app/components/portfolio/CanvasGrid";
import MapCard from "@/app/components/portfolio/MapCard";
import MockChatPanel from "@/app/components/portfolio/MockChatPanel";

export default function DashboardDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");

  const dashboards = useDashboardStore((s) => s.dashboards);
  const dashboardsHydrated = useDashboardStore((s) => s.hasHydrated);
  const insightsHydrated = useInsightStore((s) => s.hasHydrated);
  const seedIfEmpty = useInsightStore((s) => s.seedIfEmpty);
  const insights = useInsightStore((s) => s.insights);
  const updateAnnotation = useDashboardStore((s) => s.updateAnnotation);
  const removeBlock = useDashboardStore((s) => s.removeBlock);
  const reorderBlocks = useDashboardStore((s) => s.reorderBlocks);

  useEffect(() => {
    if (insightsHydrated) seedIfEmpty();
  }, [insightsHydrated, seedIfEmpty]);

  const dashboard = useMemo(
    () => dashboards.find((d) => d.id === id),
    [dashboards, id]
  );

  const insightById = useMemo(
    () => new Map(insights.map((i) => [i.id, i])),
    [insights]
  );

  if (dashboardsHydrated && !dashboard) return notFound();
  if (!dashboard) return null;

  return (
    <Box display="grid" gridTemplateColumns="1fr 340px" minH="calc(100vh - 56px)">
      <Box overflowY="auto" maxH="calc(100vh - 56px)" p={5}>
        {/* Slim banner that calls out the design intent */}
        <Box
          bg="green.subtle"
          border="1px solid"
          borderColor="green.muted"
          rounded="md"
          px={3}
          py={2}
          mb={4}
          fontSize="xs"
          color="green.fg"
        >
          <strong>Same pattern as Explore</strong> — chat narrates against this
          dashboard instead of the map.
        </Box>

        <Flex
          justify="space-between"
          align="flex-start"
          gap={4}
          flexWrap="wrap"
          mb={3}
        >
          <Box minW={0}>
            <Button size="xs" variant="ghost" asChild mb={1}>
              <Link href="/dashboards">
                <ArrowLeftIcon size={14} />
                Dashboards
              </Link>
            </Button>
            <HStack gap={2}>
              <Heading as="h1" size="lg" m={0} truncate>
                {dashboard.name}
              </Heading>
              <Badge colorPalette="green">Area fixed</Badge>
              {dashboard.aoi.isMultiArea && (
                <Badge colorPalette="orange" variant="subtle">
                  Multi-area · {dashboard.aoi.src_ids.length}
                </Badge>
              )}
            </HStack>
            <Text fontSize="xs" color="fg.muted" mt={1}>
              {dashboard.blocks.length} block
              {dashboard.blocks.length === 1 ? "" : "s"} · insights auto-pin as
              you chat
            </Text>
          </Box>
          <Button size="xs" variant="outline" disabled title="Coming soon">
            <DownloadSimpleIcon size={12} />
            Export PDF
          </Button>
        </Flex>

        <Box mb={4}>
          <MapCard aoi={dashboard.aoi} />
        </Box>

        <CanvasGrid
          ids={dashboard.blocks.map((b) => b.id)}
          onReorder={(ids) => reorderBlocks(dashboard.id, ids)}
          trailing={
            <Box
              bg="bg.subtle"
              border="1.5px dashed"
              borderColor="border"
              rounded="md"
              h="160px"
              display="flex"
              flexDir="column"
              alignItems="center"
              justifyContent="center"
              color="fg.muted"
              fontSize="xs"
              textAlign="center"
              p={2}
            >
              <Text>↓ Chat to generate</Text>
              <Text fontSize="2xs" mt={0.5}>
                insights pin here
              </Text>
            </Box>
          }
        >
          {dashboard.blocks.map((block) => {
            const isSeed =
              block.type === "insight" &&
              block.insightId === dashboard.seededFromInsightId;
            return (
              <SortableBlock key={block.id} id={block.id}>
                {(handle) => {
                  if (block.type === "annotation") {
                    return (
                      <AnnotationBlock
                        text={block.text ?? ""}
                        onChange={(text) =>
                          updateAnnotation(dashboard.id, block.id, text)
                        }
                        onRemove={() => removeBlock(dashboard.id, block.id)}
                        dragHandleProps={handle}
                        source="chat"
                        workspace={dashboard}
                        blockId={block.id}
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
                      isSeed={isSeed}
                      onRemove={
                        isSeed
                          ? undefined
                          : () => removeBlock(dashboard.id, block.id)
                      }
                      dragHandleProps={handle}
                    />
                  );
                }}
              </SortableBlock>
            );
          })}
        </CanvasGrid>
      </Box>

      <Box
        borderLeft="1px solid"
        borderColor="border"
        maxH="calc(100vh - 56px)"
      >
        <MockChatPanel dashboard={dashboard} />
      </Box>
    </Box>
  );
}
