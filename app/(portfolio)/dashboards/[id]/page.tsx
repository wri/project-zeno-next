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
  SimpleGrid,
} from "@chakra-ui/react";
import {
  ArrowLeftIcon,
  DownloadSimpleIcon,
  MapPinIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import usePinnedInsightStore from "@/app/store/pinnedInsightStore";
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
  const insightsHydrated = usePinnedInsightStore((s) => s.hasHydrated);
  const seedIfEmpty = usePinnedInsightStore((s) => s.seedIfEmpty);
  const insights = usePinnedInsightStore((s) => s.insights);
  const updateAnnotation = useDashboardStore((s) => s.updateAnnotation);
  const addMapBlock = useDashboardStore((s) => s.addMapBlock);
  const addAnnotationBlock = useDashboardStore((s) => s.addAnnotationBlock);
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

  const insightBlockCount = dashboard.blocks.filter(
    (b) => b.type === "insight"
  ).length;
  const annotationBlockCount = dashboard.blocks.filter(
    (b) => b.type === "annotation"
  ).length;
  const mapBlockCount = dashboard.blocks.filter((b) => b.type === "map").length;

  return (
    <Box display="grid" gridTemplateColumns="1fr 340px" minH="calc(100vh - 56px)">
      <Box
        overflowY="auto"
        maxH="calc(100vh - 56px)"
        bg="bg.subtle"
        p={{ base: 4, md: 6 }}
      >
        {/* Header band — full width, sits on the page bg (no paper sheet) */}
        <Flex
          justify="space-between"
          align="flex-start"
          gap={4}
          flexWrap="wrap"
          mb={4}
        >
          <Box minW={0}>
            <Button size="xs" variant="ghost" asChild mb={2}>
              <Link href="/dashboards">
                <ArrowLeftIcon size={14} />
                Dashboards
              </Link>
            </Button>
            <HStack gap={2} mb={1} flexWrap="wrap">
              <Heading as="h1" size="xl" m={0} truncate>
                {dashboard.name}
              </Heading>
              <Badge colorPalette="green" size="md">
                <MapPinIcon size={12} />
                {dashboard.aoi.name}
              </Badge>
              {dashboard.aoi.isMultiArea && (
                <Badge colorPalette="orange" variant="subtle" size="md">
                  Multi-area · {dashboard.aoi.src_ids.length}
                </Badge>
              )}
            </HStack>
            <Text fontSize="xs" color="fg.muted">
              Area fixed · insights auto-pin as you chat
            </Text>
          </Box>
          <HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addAnnotationBlock(dashboard.id)}
            >
              <PlusIcon size={12} />
              Add annotation
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorPalette="green"
              onClick={() => setMapDialogOpen(true)}
            >
              <MapPinIcon size={12} />
              Add map
            </Button>
            <Button size="sm" variant="outline" disabled title="Coming soon">
              <DownloadSimpleIcon size={12} />
              Export PDF
            </Button>
          </HStack>
        </Flex>

        {/* KPI tiles + hero AOI map — dashboard-style summary band */}
        <SimpleGrid
          columns={{ base: 1, md: 4 }}
          gap={3}
          mb={4}
          gridAutoRows="1fr"
        >
          <KpiTile label="Insights" value={insightBlockCount} accent="primary" />
          <KpiTile
            label="Annotations"
            value={annotationBlockCount}
            accent="purple"
          />
          <KpiTile label="Maps" value={mapBlockCount} accent="green" />
          <KpiTile
            label="Areas"
            value={dashboard.aoi.isMultiArea ? dashboard.aoi.src_ids.length : 1}
            accent="orange"
          />
        </SimpleGrid>

        <Box
          rounded="md"
          overflow="hidden"
          border="1px solid"
          borderColor="green.muted"
          mb={5}
        >
          <MapCard aoi={dashboard.aoi} height={220} bare />
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

type KpiAccent = "primary" | "purple" | "green" | "orange";

const ACCENT_BORDER: Record<KpiAccent, string> = {
  primary: "primary.solid",
  purple: "purple.solid",
  green: "green.solid",
  orange: "orange.solid",
};

const ACCENT_FG: Record<KpiAccent, string> = {
  primary: "primary.fg",
  purple: "purple.fg",
  green: "green.fg",
  orange: "orange.fg",
};

// Small summary tile for the dashboard header band. Borrows a token-coloured
// left rule per accent so the four-up strip reads as a status row at a glance.
function KpiTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: KpiAccent;
}) {
  return (
    <Box
      bg="bg"
      border="1px solid"
      borderColor="border"
      borderLeft="3px solid"
      borderLeftColor={ACCENT_BORDER[accent]}
      rounded="md"
      px={4}
      py={3}
    >
      <Text
        fontSize="2xs"
        fontFamily="mono"
        fontWeight="semibold"
        letterSpacing="wider"
        textTransform="uppercase"
        color="fg.muted"
        mb={0.5}
      >
        {label}
      </Text>
      <Text
        fontSize="2xl"
        fontWeight="bold"
        lineHeight="1"
        color={ACCENT_FG[accent]}
      >
        {value}
      </Text>
    </Box>
  );
}
