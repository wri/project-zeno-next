"use client";

import { useMemo, useEffect, useState } from "react";
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
import {
  ArrowLeftIcon,
  DownloadSimpleIcon,
  MapPinIcon,
} from "@phosphor-icons/react";
import useInsightStore from "@/app/store/insightStore";
import useDashboardStore from "@/app/store/dashboardStore";
import InsightBlock from "@/app/components/portfolio/InsightBlock";
import AnnotationBlock from "@/app/components/portfolio/AnnotationBlock";
import MapBlock from "@/app/components/portfolio/MapBlock";
import AddMapDialog from "@/app/components/portfolio/AddMapDialog";
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
  const addMapBlock = useDashboardStore((s) => s.addMapBlock);
  const resizeBlock = useDashboardStore((s) => s.resizeBlock);
  const removeBlock = useDashboardStore((s) => s.removeBlock);
  const reorderBlocks = useDashboardStore((s) => s.reorderBlocks);

  const [mapDialogOpen, setMapDialogOpen] = useState(false);

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
      <Box
        overflowY="auto"
        maxH="calc(100vh - 56px)"
        bg="bg.subtle"
        p={{ base: 4, md: 6 }}
      >
        <Box maxW="820px" mx="auto">
          <Box
            bg="bg"
            rounded="md"
            boxShadow="md"
            p={{ base: 5, md: 8 }}
          >
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
          <HStack>
            <Button
              size="xs"
              variant="outline"
              colorPalette="green"
              onClick={() => setMapDialogOpen(true)}
            >
              <MapPinIcon size={12} />
              Add map
            </Button>
            <Button size="xs" variant="outline" disabled title="Coming soon">
              <DownloadSimpleIcon size={12} />
              Export PDF
            </Button>
          </HStack>
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
              py={3}
              display="flex"
              gap={2}
              alignItems="center"
              justifyContent="center"
              color="fg.muted"
              fontSize="xs"
              textAlign="center"
              px={3}
            >
              <Text>↓ Chat to generate</Text>
              <Text fontSize="2xs">insights pin here</Text>
            </Box>
          }
        >
          {dashboard.blocks.map((block) => {
            const isSeed =
              block.type === "insight" &&
              block.insightId === dashboard.seededFromInsightId;
            return (
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
                          updateAnnotation(dashboard.id, block.id, text)
                        }
                        onRemove={() => removeBlock(dashboard.id, block.id)}
                        dragHandleProps={handle}
                        source="chat"
                        workspace={dashboard}
                        blockId={block.id}
                        size={block.size ?? "default"}
                        onResize={(s) =>
                          resizeBlock(dashboard.id, block.id, s)
                        }
                      />
                    );
                  }
                  if (block.type === "map" && block.aoi) {
                    return (
                      <MapBlock
                        aoi={block.aoi}
                        onRemove={() => removeBlock(dashboard.id, block.id)}
                        dragHandleProps={handle}
                        size={block.size ?? "default"}
                        onResize={(s) =>
                          resizeBlock(dashboard.id, block.id, s)
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
                      isSeed={isSeed}
                      onRemove={
                        isSeed
                          ? undefined
                          : () => removeBlock(dashboard.id, block.id)
                      }
                      dragHandleProps={handle}
                      size={block.size ?? "default"}
                      onResize={(s) =>
                        resizeBlock(dashboard.id, block.id, s)
                      }
                      onAddMap={() =>
                        addMapBlock(dashboard.id, insight.aoi, {
                          afterBlockId: block.id,
                          size: "default",
                        })
                      }
                    />
                  );
                }}
              </SortableBlock>
            );
          })}
        </CanvasGrid>
          </Box>
        </Box>
      </Box>

      <Box
        borderLeft="1px solid"
        borderColor="border"
        maxH="calc(100vh - 56px)"
      >
        <MockChatPanel dashboard={dashboard} />
      </Box>

      <AddMapDialog
        open={mapDialogOpen}
        onClose={() => setMapDialogOpen(false)}
        onPick={(aoi) => addMapBlock(dashboard.id, aoi)}
      />
    </Box>
  );
}
