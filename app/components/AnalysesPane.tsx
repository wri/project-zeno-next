"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Flex,
  Text,
  IconButton,
  Switch,
  Spinner,
  Input,
  InputGroup,
} from "@chakra-ui/react";
import {
  ChartLineIcon,
  ChartBarIcon,
  ChartPieSliceIcon,
  TableIcon,
  XIcon,
  CheckCircleIcon,
  SparkleIcon,
  SquaresFourIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import useInsightStore from "@/app/store/insightStore";
import useChatStore from "@/app/store/chatStore";
import useAnalysesPaneStore from "@/app/store/analysesPaneStore";
import { useUserInsights } from "@/app/hooks/useUserInsights";
import { WIDGET_FIXTURES } from "@/app/dashboards/lib/fixtures";
import { createDashboardFromInsight } from "@/app/dashboards/lib/createDashboardFromInsight";
import {
  type ChartFamily,
  CHART_FAMILY_LABEL,
  filterInsightEntries,
  presentFamilies,
} from "@/app/utils/insightFilters";
import { Tooltip } from "@/app/components/ui/tooltip";
import { toaster } from "@/app/components/ui/toaster";
import type { InsightWidget } from "@/app/types/chat";

// Map-page Analyses pane — a left-docked list of analyses, the list counterpart
// to the right-side InsightWorkspace chart detail (both read insightStore). On
// hover a card reveals the window-pane (SquaresFour) icon, which spins a new
// dashboard seeded with that analysis. Mirrors the dashboards' analyses panel
// but is map-scoped (Show-on-map toggle instead of Add-to-dashboard).

type FilterKey = "conversation" | "verified" | "ai";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "conversation", label: "In this conversation" },
  { key: "verified", label: "Verified" },
  { key: "ai", label: "AI generated" },
];

// Curated "verified" stubs — a handful of the shared fixtures, led by the
// grassland analysis the design mocks up.
const VERIFIED_STUBS: InsightWidget[] = [
  WIDGET_FIXTURES.grasslandArea,
  WIDGET_FIXTURES.treeCoverLine,
  WIDGET_FIXTURES.landCoverPie,
  WIDGET_FIXTURES.driversPie,
  WIDGET_FIXTURES.biodiversityBar,
];

type Entry = { insight: InsightWidget; verified: boolean };

// De-duplicate insights by backend id (falling back to title), keeping the
// first occurrence and dropping dataset-card widgets. Used to merge live
// session insights with the same analyses fetched back from the API.
function dedupe(insights: InsightWidget[]): InsightWidget[] {
  const seen = new Set<string>();
  const out: InsightWidget[] = [];
  for (const i of insights) {
    if (i.type === "dataset-card") continue;
    const key = i.id ?? i.title;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }
  return out;
}

/** Thumbnail icon per chart type. */
const TYPE_ICON: Record<string, React.ElementType> = {
  line: ChartLineIcon,
  area: ChartLineIcon,
  bar: ChartBarIcon,
  "stacked-bar": ChartBarIcon,
  "grouped-bar": ChartBarIcon,
  pie: ChartPieSliceIcon,
  table: TableIcon,
};

/** Rounded pill used for the source filters. */
function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      px="8px"
      py="4px"
      rounded="full"
      fontSize="12px"
      fontWeight="500"
      lineHeight="16px"
      cursor="pointer"
      borderWidth="1px"
      bg={active ? "#0049AA" : "#F4F5F6"}
      borderColor={active ? "#0049AA" : "#E0E2E5"}
      color={active ? "#FFFFFF" : "#3A4048"}
      _hover={active ? undefined : { bg: "#ECEEF0" }}
    >
      {children}
    </Box>
  );
}

/** 80px chart-thumbnail strip down the left of each card. */
function Thumb({ type }: { type: string }) {
  const Icon = TYPE_ICON[type] ?? ChartLineIcon;
  return (
    <Flex
      w="80px"
      flexShrink={0}
      align="center"
      justify="center"
      alignSelf="stretch"
      bgGradient="to-br"
      gradientFrom="blue.100"
      gradientTo="green.100"
      color="fg.link"
      borderRightWidth="1px"
      borderColor="rgba(19,22,25,0.1)"
    >
      <Icon size={24} />
    </Flex>
  );
}

/** Provenance eyebrow — verified (olive check) or AI-generated (sparkle). */
function TypeLabel({ verified }: { verified: boolean }) {
  return (
    <Flex align="center" gap={1} color={verified ? "#8E9954" : "#4A64CB"}>
      {verified ? <CheckCircleIcon size={16} /> : <SparkleIcon size={16} />}
      <Text
        fontFamily="mono"
        fontSize="10px"
        letterSpacing="0.5px"
        textTransform="uppercase"
        whiteSpace="nowrap"
      >
        {verified ? "Verified analysis" : "AI generated"}
      </Text>
    </Flex>
  );
}

function AnalysisCard({
  insight,
  verified,
  shown,
  onToggle,
  onCreateDashboard,
}: {
  insight: InsightWidget;
  verified: boolean;
  shown: boolean;
  onToggle: () => void;
  onCreateDashboard: () => void;
}) {
  return (
    <Flex direction="column" gap="4px" w="full">
      <Box
        className="group"
        borderWidth="1px"
        borderColor={shown ? "#0049AA" : "#E0E2E5"}
        bg={shown ? "#DDE2F5" : "#FFFFFF"}
        rounded="4px"
        overflow="hidden"
        transition="border-color 0.15s ease, background 0.15s ease"
        _hover={shown ? undefined : { borderColor: "#0049AA", bg: "#F0F4FF" }}
      >
        <Flex align="stretch">
          <Thumb type={insight.type} />
          <Flex
            flex="1 1 auto"
            minW={0}
            direction="column"
            px={4}
            py={3}
            gap={2}
            bg={shown ? "#F0F4FF" : undefined}
          >
            {/* Eyebrow + hover-revealed create-dashboard action */}
            <Flex justify="space-between" align="center" gap={2}>
              <TypeLabel verified={verified} />
              <Tooltip
                content="Create a dashboard from this analysis"
                showArrow
              >
                <IconButton
                  aria-label="Create a dashboard from this analysis"
                  size="2xs"
                  variant="ghost"
                  color="#4A64CB"
                  flexShrink={0}
                  opacity={shown ? 1 : 0}
                  transition="opacity 0.15s ease"
                  _groupHover={{ opacity: 1 }}
                  _focusVisible={{ opacity: 1 }}
                  onClick={onCreateDashboard}
                >
                  <SquaresFourIcon size={16} />
                </IconButton>
              </Tooltip>
            </Flex>

            <Text
              fontWeight="medium"
              fontSize="12px"
              lineHeight="1.5"
              color="#3A4048"
              lineClamp={1}
            >
              {insight.title}
            </Text>

            {insight.description && (
              <Text
                fontFamily="mono"
                fontSize="10px"
                color="#656E7B"
                lineClamp={2}
              >
                {insight.description}
              </Text>
            )}

            <Box h="1px" bg={shown ? "#BBC5EB" : "#E0E2E5"} />

            <Switch.Root
              checked={shown}
              onCheckedChange={onToggle}
              size="sm"
              colorPalette="primary"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label
                fontSize="12px"
                color={shown ? "#4A64CB" : "#737C94"}
              >
                Show on map
              </Switch.Label>
            </Switch.Root>
          </Flex>
        </Flex>
      </Box>

      {/* Methodology footer — only for the selected (shown) analysis. */}
      {shown && (
        <Flex
          h="32px"
          px="12px"
          py="8px"
          rounded="8px"
          bg="#F7FBD9"
          align="center"
          justify="space-between"
          fontSize="10px"
          gap={2}
        >
          <Text color="#23271A" lineClamp={1}>
            Source:{" "}
            {insight.datasetName ?? insight.analysisParams?.dataset ?? "GNW"}
          </Text>
          <Text color="#175EA3" whiteSpace="nowrap" flexShrink={0}>
            View methodology →
          </Text>
        </Flex>
      )}
    </Flex>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Flex
      flexDir="column"
      align="center"
      gap={1}
      py={8}
      px={4}
      textAlign="center"
    >
      <Box color="fg.muted" mb={1}>
        <SparkleIcon size={24} />
      </Box>
      <Text fontSize="xs" color="fg.muted">
        {message}
      </Text>
    </Flex>
  );
}

export default function AnalysesPane() {
  const router = useRouter();
  const closePane = useAnalysesPaneStore((s) => s.closePane);
  const currentThreadId = useChatStore((s) => s.currentThreadId);

  // Live insights from the current session (what the chart workspace shows),
  // this thread's persisted insights (GET /api/insights?thread_id=…), and every
  // insight the user has generated across all threads.
  const live = useInsightStore((s) => s.insights);
  const { insights: threadInsights, isLoading: threadLoading } =
    useUserInsights(currentThreadId ?? undefined);
  const { insights: allInsights, isLoading: aiLoading } = useUserInsights();

  const [filter, setFilter] = useState<FilterKey>("conversation");
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<ChartFamily | "all">("all");
  // Show-on-map is a visual selection in this prototype (analyses render in the
  // InsightWorkspace, not as map layers yet). Tracked per analysis key.
  const [shownKeys, setShownKeys] = useState<Set<string>>(new Set());

  // "In this conversation": live session insights first, then this thread's
  // persisted insights — deduped so a freshly-generated chart that hasn't yet
  // round-tripped through the API still appears (live wins).
  const conversationEntries: Entry[] = dedupe([
    ...live,
    ...(currentThreadId ? threadInsights : []),
  ]).map((insight) => ({ insight, verified: false }));
  const verifiedEntries: Entry[] = VERIFIED_STUBS.map((insight) => ({
    insight,
    verified: true,
  }));
  const aiEntries: Entry[] = dedupe(allInsights).map((insight) => ({
    insight,
    verified: false,
  }));

  const entries =
    filter === "verified"
      ? verifiedEntries
      : filter === "ai"
        ? aiEntries
        : conversationEntries;
  // Verified stubs are synchronous; the API-backed groups can be loading.
  const loading =
    filter === "ai" ? aiLoading : filter === "conversation" && threadLoading;

  // Chart-type chips reflect only the families present in the active source, so
  // we never show a "Pie" chip that would match nothing. Search + family then
  // narrow the visible list.
  const families = presentFamilies(entries.map((e) => e.insight));
  // If the active source no longer contains the chosen family (e.g. after
  // switching sources), fall back to "all" rather than showing nothing.
  const activeFamily =
    family !== "all" && !families.includes(family) ? "all" : family;
  const visible = filterInsightEntries(entries, query, activeFamily);

  const keyOf = (e: Entry, i: number) =>
    e.insight.id ?? `${e.verified}-${e.insight.title}-${i}`;

  const toggleShown = (key: string) =>
    setShownKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const createDashboard = (insight: InsightWidget, verified: boolean) => {
    const id = createDashboardFromInsight(insight, verified);
    toaster.create({
      title: "Dashboard created",
      description: insight.title,
      type: "success",
      duration: 2000,
    });
    router.push(`/dashboards/${id}`);
  };

  const emptyMessage =
    filter === "conversation"
      ? "Analyses you generate in this conversation will appear here."
      : filter === "ai"
        ? "Insights you generate are saved here, ready to add to a dashboard."
        : "No verified analyses available.";

  return (
    <Flex
      direction="column"
      h="100%"
      w="100%"
      bg="bg.panel"
      borderRightWidth="1px"
      borderColor="border.emphasized"
      boxShadow="md"
      overflow="hidden"
    >
      {/* Header */}
      <Flex
        flexShrink={0}
        h="40px"
        px={4}
        align="center"
        justify="space-between"
        borderBottomWidth="1px"
        borderColor="#E0E2E5"
      >
        <Flex align="center" gap={2} color="#656E7B">
          <ChartLineIcon size={16} />
          <Text
            fontFamily="mono"
            fontSize="10px"
            letterSpacing="0.3px"
            textTransform="uppercase"
          >
            Analyses
          </Text>
        </Flex>
        <IconButton
          aria-label="Close analyses"
          size="xs"
          variant="ghost"
          color="#656E7B"
          onClick={closePane}
        >
          <XIcon size={16} />
        </IconButton>
      </Flex>

      {/* Source filters */}
      <Flex flexShrink={0} gap={2} px={4} pt={3} pb={2} flexWrap="wrap">
        {FILTERS.map((f) => (
          <FilterPill
            key={f.key}
            active={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </FilterPill>
        ))}
      </Flex>

      {/* Search by title / summary */}
      <Box flexShrink={0} px={4} pb={2}>
        <InputGroup startElement={<MagnifyingGlassIcon size={16} />}>
          <Input
            size="sm"
            placeholder="Search analyses…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
      </Box>

      {/* Chart-type filter — only families present in the active source */}
      {families.length > 0 && (
        <Flex flexShrink={0} gap={2} px={4} pb={3} flexWrap="wrap">
          <FilterPill
            active={activeFamily === "all"}
            onClick={() => setFamily("all")}
          >
            All types
          </FilterPill>
          {families.map((f) => (
            <FilterPill
              key={f}
              active={activeFamily === f}
              onClick={() => setFamily(f)}
            >
              {CHART_FAMILY_LABEL[f]}
            </FilterPill>
          ))}
        </Flex>
      )}

      {/* List */}
      <Box flex="1 1 auto" minH={0} overflowY="auto" px={4} pb={3}>
        {entries.length === 0 && loading ? (
          <Flex align="center" gap={2} color="fg.muted" fontSize="sm" py={6}>
            <Spinner size="xs" />
            Loading analyses…
          </Flex>
        ) : entries.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : visible.length === 0 ? (
          <EmptyState message="No analyses match your search." />
        ) : (
          <Flex direction="column" gap={3}>
            {visible.map((e, i) => {
              const key = keyOf(e, i);
              return (
                <AnalysisCard
                  key={key}
                  insight={e.insight}
                  verified={e.verified}
                  shown={shownKeys.has(key)}
                  onToggle={() => toggleShown(key)}
                  onCreateDashboard={() =>
                    createDashboard(e.insight, e.verified)
                  }
                />
              );
            })}
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
