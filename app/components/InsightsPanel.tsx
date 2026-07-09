"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Menu,
  Portal,
  Stack,
  Text,
  Wrap,
} from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  CaretLeftIcon,
  ChartLineIcon,
  DotsThreeVerticalIcon,
  SealCheckIcon,
  SparkleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { useShallow } from "zustand/react/shallow";

import {
  getCatalogColumnMotionStyle,
  getCatalogColumnPanelFlexProps,
} from "@/app/chatPanelShared";
import {
  CATALOG_CARD_WIDTH_PX,
  getCatalogLeftPx,
} from "@/app/explorationLayout";
import {
  chartsToWidgets,
  type InsightRecord,
  type InsightVerification,
} from "@/src/entities/insight";
import {
  useUserInsights,
  verifiedInsights,
} from "@/src/features/insights-history";
import useChatStore from "@/app/store/chatStore";
import useInsightStore from "@/app/store/insightStore";
import useSidebarStore from "@/app/store/sidebarStore";
import type { InsightWidget } from "@/app/types/chat";

import { CatalogCard } from "./CatalogCard";
import WidgetMessage from "./WidgetMessage";
import { Tooltip } from "./ui/tooltip";

/** Matches the other exploration panels' enter & exit (slide from the left). */
const insightsPanelSlideTransition = {
  duration: 0.2,
  ease: "easeInOut",
} as const;

/** Scrollable list chrome: vertical scroll without visible scrollbars. */
const insightsListScrollStyle = {
  overflowY: "auto",
  overflowX: "hidden",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
} as const;

const INSIGHT_LABEL_COLOR = "#0049AA";
const INSIGHT_SELECTED_BG = "rgba(0, 73, 170, 0.06)";

type InsightFilter = "conversation" | "verified" | "ai";

const INSIGHT_FILTERS: { id: InsightFilter; label: string }[] = [
  { id: "conversation", label: "In this conversation" },
  { id: "verified", label: "Verified" },
  { id: "ai", label: "AI generated" },
];

/**
 * One card in the panel = one chart, enriched with its insight's card-level
 * metadata (source, timestamp, verification). Mirrors how the on-map
 * `InsightWorkspace` treats each widget as one "analysis".
 */
interface InsightCardItem {
  widget: InsightWidget;
  source: string;
  createdAt: string;
  verification: InsightVerification;
}

function recordToItems(record: InsightRecord): InsightCardItem[] {
  return chartsToWidgets(record.charts).map((widget) => ({
    widget,
    source: record.source,
    createdAt: record.createdAt,
    verification: record.verification,
  }));
}

function liveWidgetToItem(widget: InsightWidget): InsightCardItem {
  return {
    widget,
    source: widget.datasetName ?? "",
    createdAt: "",
    verification: "ai-generated",
  };
}

const itemId = (item: InsightCardItem): string =>
  item.widget.id ?? item.widget.title;

/** Concatenate lists, keeping the first occurrence of each chart id. */
function mergeById(...lists: InsightCardItem[][]): InsightCardItem[] {
  const seen = new Set<string>();
  const out: InsightCardItem[] = [];
  for (const list of lists) {
    for (const item of list) {
      const id = itemId(item);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(item);
    }
  }
  return out;
}

function formatGeneratedAt(createdAt: string): string {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? "" : format(date, "d MMM yyyy");
}

function cardDescription(item: InsightCardItem): string {
  const parts = [item.source, formatGeneratedAt(item.createdAt)].filter(
    Boolean
  );
  return parts.length > 0 ? parts.join(" · ") : "Analysis";
}

/**
 * Left-column exploration panel listing the user's recent analyses as cards —
 * a sibling of `CatalogPanel` (datasets) and `AreasPanel` (areas), mutually
 * exclusive with them via `sidebarStore`. Data comes from the insights-history
 * feature slice + the live `insightStore`; "Show on map" drives the on-map
 * `InsightWorkspace` overlay.
 */
export default function InsightsPanel() {
  const [filter, setFilter] = useState<InsightFilter>("conversation");
  const { insightsPanelOpen, setInsightsPanelOpen, isChatFullSize } =
    useSidebarStore();

  const leftPx = getCatalogLeftPx(isChatFullSize);
  const compactSlide = !isChatFullSize;

  return (
    <AnimatePresence>
      {insightsPanelOpen && (
        <motion.div
          key="insights-panel"
          initial={compactSlide ? { opacity: 0, x: -16 } : false}
          animate={{ opacity: 1, x: 0 }}
          exit={compactSlide ? { opacity: 0, x: -16 } : { opacity: 0 }}
          transition={insightsPanelSlideTransition}
          style={getCatalogColumnMotionStyle(leftPx)}
        >
          <Flex {...getCatalogColumnPanelFlexProps(isChatFullSize)}>
            <InsightsPanelHeader onClose={() => setInsightsPanelOpen(false)} />
            <Flex
              flex={1}
              minH={0}
              minW={0}
              flexDirection="column"
              gap={4}
              pt={4}
              px={3}
              pb={6}
              overflow="hidden"
            >
              <Wrap gap={1} flexShrink={0} overflow="hidden">
                {INSIGHT_FILTERS.map((f) => {
                  const isActive = filter === f.id;
                  return (
                    <Button
                      key={f.id}
                      h="24px"
                      minH="24px"
                      py="4px"
                      px="8px"
                      borderRadius="full"
                      fontSize="12px"
                      fontWeight="400"
                      lineHeight="16px"
                      bg={isActive ? "fg.link" : "neutral.300"}
                      color={isActive ? "white" : "fg"}
                      border="1px solid"
                      borderColor={isActive ? "fg.link" : "neutral.300"}
                      _hover={{ bg: isActive ? "fg.link" : "neutral.400" }}
                      onClick={() => setFilter(f.id)}
                    >
                      {f.label}
                    </Button>
                  );
                })}
              </Wrap>
              <Stack
                gap={4}
                flex={1}
                minH={0}
                minW={0}
                pb={2}
                css={insightsListScrollStyle}
              >
                <InsightsList filter={filter} />
              </Stack>
            </Flex>
          </Flex>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InsightsPanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <Flex
      position="relative"
      zIndex={10}
      flexShrink={0}
      h="40px"
      py="4px"
      px={3}
      justifyContent="space-between"
      alignItems="center"
      borderBottom="1px solid"
      borderColor="#E0E2E5"
      overflow="hidden"
      minW={0}
    >
      <Flex alignItems="center" gap="8px" minW={0} flex="1" overflow="hidden">
        <ChartLineIcon size={16} color={INSIGHT_LABEL_COLOR} />
        <Text
          fontSize="10px"
          fontWeight="400"
          fontFamily="mono"
          lineHeight="16px"
          letterSpacing="0.03em"
          textTransform="uppercase"
          color="#656E7B"
          m={0}
        >
          Insights
        </Text>
      </Flex>
      <IconButton
        aria-label="Close insights panel"
        variant="ghost"
        size="2xs"
        p={0}
        minW="16px"
        h="16px"
        w="16px"
        color="#656E7B"
        onClick={onClose}
      >
        <XIcon size={12} />
      </IconButton>
    </Flex>
  );
}

function InsightsList({ filter }: { filter: InsightFilter }) {
  const currentThreadId = useChatStore((s) => s.currentThreadId);
  const liveWidgets = useInsightStore(useShallow((s) => s.insights));
  // Both queries are cached separately by thread id; when there is no thread the
  // scoped query collapses onto the unscoped one (same key) and is ignored below.
  const { insights: threadInsights } = useUserInsights(currentThreadId);
  const { insights: allInsights } = useUserInsights();

  const items = useMemo<InsightCardItem[]>(() => {
    if (filter === "verified") return verifiedInsights.flatMap(recordToItems);
    if (filter === "ai") return allInsights.flatMap(recordToItems);
    const historical = currentThreadId
      ? threadInsights.flatMap(recordToItems)
      : [];
    return mergeById(historical, liveWidgets.map(liveWidgetToItem));
  }, [filter, allInsights, threadInsights, liveWidgets, currentThreadId]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIndex = selectedId
    ? items.findIndex((i) => itemId(i) === selectedId)
    : -1;

  if (items.length === 0) return <EmptyState filter={filter} />;

  if (selectedIndex >= 0) {
    return (
      <InsightDetail
        items={items}
        index={selectedIndex}
        onIndexChange={(i) => setSelectedId(itemId(items[i]))}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <>
      {items.map((item) => (
        <InsightCard
          key={itemId(item)}
          item={item}
          onOpen={() => setSelectedId(itemId(item))}
        />
      ))}
    </>
  );
}

function EmptyState({ filter }: { filter: InsightFilter }) {
  const message =
    filter === "verified"
      ? "No verified analyses yet."
      : filter === "ai"
        ? "No analyses generated yet. Ask the assistant to analyse an area."
        : "No analyses in this conversation yet. Ask the assistant to analyse an area, or generate one from a dataset and area.";
  return (
    <Text fontSize="sm" color="fg.muted" mt={4}>
      {message}
    </Text>
  );
}

function InsightCard({
  item,
  onOpen,
}: {
  item: InsightCardItem;
  onOpen: () => void;
}) {
  const widgetId = item.widget.id;
  const shown = useInsightStore(
    useShallow((s) => !!widgetId && s.insights.some((i) => i.id === widgetId))
  );
  const addInsight = useInsightStore((s) => s.addInsight);
  const removeInsight = useInsightStore((s) => s.removeInsight);

  function handleToggle(checked: boolean) {
    if (!widgetId) return;
    if (checked) addInsight(item.widget);
    else removeInsight(widgetId);
  }

  return (
    <Box w={`${CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <CatalogCard
        thumbnail={<InsightThumbnail />}
        typeLabel="ANALYSIS"
        typeLabelColor={INSIGHT_LABEL_COLOR}
        title={item.widget.title}
        description={cardDescription(item)}
        selected={shown}
        selectedBg={INSIGHT_SELECTED_BG}
        showOnMap={shown}
        onShowOnMapChange={handleToggle}
        onInfoClick={onOpen}
        infoTooltip="View analysis"
        badge={<VerificationBadge verification={item.verification} />}
        titleActions={<AddToDashboardMenu />}
      />
    </Box>
  );
}

function InsightThumbnail() {
  return (
    <Flex w="100%" h="100%" align="center" justify="center" bg="primary.25">
      <ChartLineIcon size={28} color={INSIGHT_LABEL_COLOR} weight="thin" />
    </Flex>
  );
}

function VerificationBadge({
  verification,
}: {
  verification: InsightVerification;
}) {
  const verified = verification === "verified";
  return (
    <Flex
      align="center"
      gap="4px"
      px="6px"
      h="16px"
      borderRadius="full"
      flexShrink={0}
      bg={verified ? "rgba(26, 169, 21, 0.12)" : "rgba(0, 73, 170, 0.10)"}
      color={verified ? "#128A0E" : INSIGHT_LABEL_COLOR}
    >
      {verified ? (
        <SealCheckIcon size={11} weight="fill" />
      ) : (
        <SparkleIcon size={11} weight="fill" />
      )}
      <Text
        fontSize="9px"
        fontFamily="mono"
        lineHeight="1"
        textTransform="uppercase"
        letterSpacing="0.03em"
        whiteSpace="nowrap"
      >
        {verified ? "Verified" : "AI generated"}
      </Text>
    </Flex>
  );
}

function AddToDashboardMenu() {
  return (
    <Menu.Root positioning={{ placement: "bottom-end" }}>
      <Menu.Trigger asChild>
        <IconButton
          aria-label="More analysis actions"
          variant="ghost"
          size="2xs"
          p={0}
          minW="16px"
          h="16px"
          w="16px"
          color={INSIGHT_LABEL_COLOR}
          onClick={(e) => e.stopPropagation()}
        >
          <DotsThreeVerticalIcon size={16} color={INSIGHT_LABEL_COLOR} />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            {/* Disabled until dashboards land (PZB-890). */}
            <Menu.Item value="add-to-dashboard" disabled>
              Add to dashboard (coming soon)
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

function InsightDetail({
  items,
  index,
  onIndexChange,
  onBack,
}: {
  items: InsightCardItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onBack: () => void;
}) {
  const item = items[index];
  const total = items.length;

  return (
    <Box w={`${CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <Button
        variant="ghost"
        size="xs"
        px={1}
        mb={2}
        color="#656E7B"
        onClick={onBack}
      >
        <CaretLeftIcon size={14} />
        Back to analyses
      </Button>

      <WidgetMessage widget={item.widget} inWorkspace />

      {total > 1 && (
        <Flex mt={3} justify="space-between" align="center">
          <Tooltip content="Previous analysis" openDelay={400}>
            <IconButton
              size="xs"
              variant="ghost"
              border="1px solid"
              borderColor="border.emphasized"
              aria-label="Previous analysis"
              disabled={index === 0}
              onClick={() => onIndexChange(index - 1)}
            >
              <ArrowArcLeftIcon size={14} />
            </IconButton>
          </Tooltip>
          <Text
            fontSize="xs"
            color="neutral.500"
            aria-live="polite"
            css={{ fontVariantNumeric: "tabular-nums" }}
          >
            {index + 1} of {total} available analyses
          </Text>
          <Tooltip content="Next analysis" openDelay={400}>
            <IconButton
              size="xs"
              variant="ghost"
              border="1px solid"
              borderColor="border.emphasized"
              aria-label="Next analysis"
              disabled={index === total - 1}
              onClick={() => onIndexChange(index + 1)}
            >
              <ArrowArcRightIcon size={14} />
            </IconButton>
          </Tooltip>
        </Flex>
      )}
    </Box>
  );
}
