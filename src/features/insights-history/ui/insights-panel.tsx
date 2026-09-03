"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Stack,
  Switch,
  Text,
  Wrap,
} from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  CaretLeftIcon,
  ChartLineIcon,
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
  resolveInsightTitle,
  type InsightRecord,
  type InsightVerification,
} from "@/src/entities/insight";
// Deep imports (not the feature barrel) so the map's InsightsPanel doesn't pull
// the dashboards pages into its bundle, and so mounting the pane on a dashboard
// can't create a feature import cycle — matching how the app already reaches
// dashboards/ui (e.g. WidgetMessage → AddToDashboardToggle).
import RemoveAnalysisDialog from "@/src/features/dashboards/ui/RemoveAnalysisDialog";
import { useAddInsightToDashboard } from "@/src/features/dashboards/ui/useAddInsightToDashboard";
import { useCurrentDashboardArea } from "@/src/features/dashboards/ui/useCurrentDashboardArea";
import { useUserInsights } from "./use-user-insights";
import { verifiedInsights } from "../lib/verified-fixtures";
import {
  liveWidgetsToGroups,
  mergeGroupsById,
  recordToGroup,
  type InsightGroupItem,
} from "../lib/insight-groups";
import useChatStore from "@/app/store/chatStore";
import useInsightStore from "@/app/store/insightStore";
import useSidebarStore from "@/app/store/sidebarStore";
import useViewContextStore from "@/app/store/viewContextStore";
import type { InsightWidget } from "@/app/types/chat";

import { CatalogCard } from "@/app/components/CatalogCard";
import InsightCaption from "@/app/components/InsightCaption";
import WidgetMessage from "@/app/components/WidgetMessage";
import { Tooltip } from "@/app/components/ui/tooltip";
import { WidgetIconComponent } from "@/app/utils/widgetIcons";

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
  { id: "ai", label: "AI generated" },
  { id: "verified", label: "Curated" },
];

/**
 * One card in the panel = one chart, enriched with its insight's card-level
 * metadata (source, timestamp, verification). The map surface's shape —
 * mirrors how the on-map `InsightWorkspace` treats each widget as one
 * "analysis". The dashboard surface groups per insight instead
 * (`InsightGroupItem`).
 */
interface InsightCardItem {
  widget: InsightWidget;
  source: string;
  createdAt: string;
  verification: InsightVerification;
}

function recordToItems(record: InsightRecord): InsightCardItem[] {
  const curated = record.verification === "verified";
  return chartsToWidgets(record.charts).map((widget) => ({
    widget: {
      ...widget,
      title: resolveInsightTitle(record, widget.title),
      curated,
    },
    source: record.source ?? "",
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

function groupDescription(group: InsightGroupItem): string {
  const chartCount =
    group.widgets.length > 1 ? `${group.widgets.length} charts` : "";
  const parts = [
    group.source,
    formatGeneratedAt(group.createdAt),
    chartCount,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Analysis";
}

/**
 * Left-column exploration panel listing the user's recent analyses as cards —
 * a sibling of `CatalogPanel` (datasets) and `AreasPanel` (areas), mutually
 * exclusive with them via `sidebarStore`. Data comes from the insights-history
 * feature slice + the live `insightStore`; "Show on map" drives the on-map
 * `InsightWorkspace` overlay.
 */
export function InsightsPanel() {
  const [filter, setFilter] = useState<InsightFilter>("conversation");
  // On a dashboard the AI list scopes to the dashboard's area by default; the
  // "This area" toggle broadens it to every AI analysis the user owns.
  const [areaScoped, setAreaScoped] = useState(true);
  const { insightsPanelOpen, setInsightsPanelOpen, isChatFullSize } =
    useSidebarStore();
  const isDashboard = useViewContextStore(
    (s) => s.viewContext?.page === "dashboard"
  );
  // The AI list can only actually scope once the dashboard's AOI is known
  // (detail query resolved). Until then the switch is disabled and reads
  // unchecked so its "This area only" label never overstates a scope the list
  // isn't applying — `InsightsList` falls back to the unscoped query the same
  // way (aiScope = areaScoped && dashboardArea).
  const dashboardArea = useCurrentDashboardArea();
  const areaScopeReady = !!dashboardArea;

  const leftPx = getCatalogLeftPx(isChatFullSize);
  const compactSlide = !isChatFullSize;
  const showAreaToggle = isDashboard && filter === "ai";

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
              {showAreaToggle && (
                <Switch.Root
                  size="sm"
                  checked={areaScoped && areaScopeReady}
                  disabled={!areaScopeReady}
                  onCheckedChange={(e: { checked: boolean }) =>
                    setAreaScoped(e.checked)
                  }
                  colorPalette="primary"
                  flexShrink={0}
                  display="flex"
                  alignItems="center"
                  gap="8px"
                  data-panel="analyses"
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb bg="white" />
                  </Switch.Control>
                  <Switch.Label
                    fontFamily="body"
                    fontSize="12px"
                    color="#656E7B"
                  >
                    This area only
                  </Switch.Label>
                </Switch.Root>
              )}
              <Stack
                gap={4}
                flex={1}
                minH={0}
                minW={0}
                pb={2}
                css={insightsListScrollStyle}
              >
                <InsightsList filter={filter} areaScoped={areaScoped} />
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
          Analyses
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

function InsightsList({
  filter,
  areaScoped,
}: {
  filter: InsightFilter;
  areaScoped: boolean;
}) {
  const currentThreadId = useChatStore((s) => s.currentThreadId);
  const liveWidgets = useInsightStore(useShallow((s) => s.insights));
  const isDashboard = useViewContextStore(
    (s) => s.viewContext?.page === "dashboard"
  );
  const dashboardArea = useCurrentDashboardArea();
  // On a dashboard, scope the AI list to its area (both aoi params travel
  // together). Off a dashboard, or when the "This area" toggle is off, the query
  // is unscoped. Each scope caches under its own key, so toggling is instant.
  const aiScope = areaScoped && dashboardArea ? dashboardArea : undefined;
  // Both queries are cached separately by scope key; when there is no thread the
  // scoped query collapses onto the unscoped one (same key) and is ignored below.
  const { insights: threadInsights } = useUserInsights({
    threadId: currentThreadId,
  });
  const { insights: allInsights } = useUserInsights(aiScope);

  // Dashboard surface: one card per analysis, added/removed whole — per-chart
  // visibility lives in the module's Customize menu on the grid.
  const groups = useMemo<InsightGroupItem[]>(() => {
    if (!isDashboard) return [];
    if (filter === "verified") return verifiedInsights.map(recordToGroup);
    if (filter === "ai") return allInsights.map(recordToGroup);
    return mergeGroupsById(
      currentThreadId ? threadInsights.map(recordToGroup) : [],
      liveWidgetsToGroups(liveWidgets)
    );
  }, [
    isDashboard,
    filter,
    allInsights,
    threadInsights,
    liveWidgets,
    currentThreadId,
  ]);

  // Map surface: one card per chart — each chart toggles onto the map
  // independently via the InsightWorkspace overlay.
  const items = useMemo<InsightCardItem[]>(() => {
    if (isDashboard) return [];
    if (filter === "verified") return verifiedInsights.flatMap(recordToItems);
    if (filter === "ai") return allInsights.flatMap(recordToItems);
    return mergeById(
      currentThreadId ? threadInsights.flatMap(recordToItems) : [],
      liveWidgets.map(liveWidgetToItem)
    );
  }, [
    isDashboard,
    filter,
    allInsights,
    threadInsights,
    liveWidgets,
    currentThreadId,
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isDashboard) {
    if (groups.length === 0) return <EmptyState filter={filter} />;
    const selectedGroup = groups.find((g) => g.id === selectedId);
    if (selectedGroup) {
      return (
        <InsightGroupDetail
          group={selectedGroup}
          onBack={() => setSelectedId(null)}
        />
      );
    }
    return (
      <>
        {groups.map((group) => (
          <InsightGroupCard
            key={group.id}
            group={group}
            onOpen={() => setSelectedId(group.id)}
          />
        ))}
      </>
    );
  }

  const selectedIndex = selectedId
    ? items.findIndex((i) => itemId(i) === selectedId)
    : -1;

  if (items.length === 0) return <EmptyState filter={filter} />;

  if (selectedIndex >= 0) {
    return (
      <InsightDetail
        widgets={items.map((i) => i.widget)}
        index={selectedIndex}
        onIndexChange={(i) => setSelectedId(itemId(items[i]))}
        onBack={() => setSelectedId(null)}
        unit="analysis"
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
      ? "No curated analyses yet."
      : filter === "ai"
        ? "No analyses generated yet. Ask the assistant to analyse an area."
        : "No analyses in this conversation yet. Ask the assistant to analyse an area, or generate one from a dataset and area.";
  return (
    <Text fontSize="sm" color="fg.muted" mt={4}>
      {message}
    </Text>
  );
}

/**
 * Dashboard-surface card: one analysis, added to / removed from the dashboard
 * whole. Per-chart visibility is the grid module's Customize menu, not the
 * panel's job.
 */
function InsightGroupCard({
  group,
  onOpen,
}: {
  group: InsightGroupItem;
  onOpen: () => void;
}) {
  const insight = useAddInsightToDashboard(group.addableInsightId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const title = group.title;

  return (
    <Box w={`${CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <CatalogCard
        thumbnail={<InsightThumbnail type={group.widgets[0]?.type ?? "bar"} />}
        typeLabel="ANALYSIS"
        typeLabelColor={INSIGHT_LABEL_COLOR}
        title={title}
        description={groupDescription(group)}
        selected={insight.added}
        selectedBg={INSIGHT_SELECTED_BG}
        showOnMap={insight.added}
        // Removing discards the module's arrangement, so confirm first when
        // there is any — adding, and undoing a plain add, stay one click.
        onShowOnMapChange={() =>
          insight.removeNeedsConfirm ? setConfirmOpen(true) : insight.toggle()
        }
        toggleLabel={insight.added ? "On dashboard" : "Add to dashboard"}
        toggleAriaLabel={
          insight.added
            ? `Remove ${title} from dashboard`
            : `Add ${title} to dashboard`
        }
        toggleDisabled={!insight.addable || insight.pending}
        dataPanel="analyses"
        onInfoClick={onOpen}
        infoTooltip="View analysis"
        badge={<VerificationBadge verification={group.verification} />}
      />
      <RemoveAnalysisDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        customized
        onConfirm={insight.toggle}
      />
    </Box>
  );
}

/** Map-surface card: one chart, toggled onto the map workspace. */
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
  const title = item.widget.title;

  const handleToggle = (checked: boolean) => {
    if (!widgetId) return;
    if (checked) addInsight(item.widget);
    else removeInsight(widgetId);
  };

  return (
    <Box w={`${CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <CatalogCard
        thumbnail={<InsightThumbnail type={item.widget.type} />}
        typeLabel="ANALYSIS"
        typeLabelColor={INSIGHT_LABEL_COLOR}
        title={title}
        description={cardDescription(item)}
        selected={shown}
        selectedBg={INSIGHT_SELECTED_BG}
        showOnMap={shown}
        onShowOnMapChange={handleToggle}
        dataPanel="analyses"
        onInfoClick={onOpen}
        infoTooltip="View analysis"
        badge={<VerificationBadge verification={item.verification} />}
      />
    </Box>
  );
}

function InsightThumbnail({ type }: { type: InsightWidget["type"] }) {
  const Icon = WidgetIconComponent[type];
  return (
    <Flex w="100%" h="100%" align="center" justify="center" bg="primary.25">
      <Icon size={28} color={INSIGHT_LABEL_COLOR} weight="thin" />
    </Flex>
  );
}

function VerificationBadge({
  verification,
}: {
  verification: InsightVerification;
}) {
  // Panel-card badges reuse the workspace insight caption's styling (icon +
  // label) minus its "Learn more" link, so curated and AI-assisted analyses
  // read identically on the card and in the workspace.
  return (
    <InsightCaption
      curated={verification === "verified"}
      showLearnMore={false}
    />
  );
}

/** Detail view for one analysis: pages through its own charts. */
function InsightGroupDetail({
  group,
  onBack,
}: {
  group: InsightGroupItem;
  onBack: () => void;
}) {
  const [chartIndex, setChartIndex] = useState(0);
  return (
    <InsightDetail
      widgets={group.widgets}
      index={chartIndex}
      onIndexChange={setChartIndex}
      onBack={onBack}
      unit="chart"
    />
  );
}

function InsightDetail({
  widgets,
  index,
  onIndexChange,
  onBack,
  unit,
}: {
  widgets: InsightWidget[];
  index: number;
  onIndexChange: (index: number) => void;
  onBack: () => void;
  /** What prev/next steps through: sibling analyses, or one analysis's charts. */
  unit: "analysis" | "chart";
}) {
  const widget = widgets[index];
  const total = widgets.length;
  const counter =
    unit === "analysis"
      ? `${index + 1} of ${total} available analyses`
      : `${index + 1} of ${total} charts in this analysis`;

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

      <WidgetMessage widget={widget} inWorkspace />

      {total > 1 && (
        <Flex mt={3} justify="space-between" align="center">
          <Tooltip content={`Previous ${unit}`} openDelay={400}>
            <IconButton
              size="xs"
              variant="ghost"
              border="1px solid"
              borderColor="border.emphasized"
              aria-label={`Previous ${unit}`}
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
            {counter}
          </Text>
          <Tooltip content={`Next ${unit}`} openDelay={400}>
            <IconButton
              size="xs"
              variant="ghost"
              border="1px solid"
              borderColor="border.emphasized"
              aria-label={`Next ${unit}`}
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
