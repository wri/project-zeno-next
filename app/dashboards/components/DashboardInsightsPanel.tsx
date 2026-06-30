"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, Flex, Text, IconButton, Spinner, Input } from "@chakra-ui/react";
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
import { chatPanelCardStyle } from "@/app/chatPanelShared";
import useDashboardStore from "@/app/store/dashboardStore";
import useInsightStore from "@/app/store/insightStore";
import { useUserInsights } from "@/app/hooks/useUserInsights";
import { WIDGET_FIXTURES } from "@/app/dashboards/lib/fixtures";
import {
  TEMPLATES,
  type DashboardTemplate,
} from "@/app/dashboards/lib/templates";
import { createDashboardFromInsight } from "@/app/dashboards/lib/createDashboardFromInsight";
import {
  type ChartFamily,
  CHART_FAMILY_LABEL,
  filterInsightEntries,
  matchesQuery,
  presentFamilies,
} from "@/app/utils/insightFilters";
import { Tooltip } from "@/app/components/ui/tooltip";
import { toaster } from "@/app/components/ui/toaster";
import type { InsightWidget } from "@/app/types/chat";

/** Curated "default" analyses, grouped into high-level topics. Always available
 *  in the Insights tab (the "Verified" source), alongside the user's own
 *  generative insights. */
const LIBRARY: { topic: string; insight: InsightWidget }[] = [
  { topic: "Forests", insight: WIDGET_FIXTURES.treeCoverLine },
  { topic: "Forests", insight: WIDGET_FIXTURES.tclBar },
  { topic: "Forests", insight: WIDGET_FIXTURES.tclTable },
  { topic: "Forests", insight: WIDGET_FIXTURES.treeGainArea },
  { topic: "Forests", insight: WIDGET_FIXTURES.driversPie },
  { topic: "Carbon", insight: WIDGET_FIXTURES.emissionsLine },
  { topic: "Carbon", insight: WIDGET_FIXTURES.ghgFluxBar },
  { topic: "Land", insight: WIDGET_FIXTURES.landCoverPie },
  { topic: "Land", insight: WIDGET_FIXTURES.grasslandArea },
  { topic: "Alerts", insight: WIDGET_FIXTURES.fireAlertsLine },
  { topic: "Biodiversity", insight: WIDGET_FIXTURES.biodiversityBar },
];

const VERIFIED_TOPICS = Array.from(new Set(LIBRARY.map((r) => r.topic)));

type SourceKey = "all" | "verified" | "ai";
const SOURCE_FILTERS: { key: SourceKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "ai", label: "AI generated" },
];

type LibEntry = { insight: InsightWidget; verified: boolean; topic?: string };

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

/** Rounded pill used for the topic / source filters. */
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

/** 80px chart-thumbnail strip down the left of each card (icon per type). */
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

/** Provenance "type" row — verified (olive check) or AI-generated (sparkle). */
function TypeLabel({ verified }: { verified: boolean }) {
  return (
    <Flex align="center" gap={1} color={verified ? "#8E9954" : "#4A64CB"}>
      {verified ? <CheckCircleIcon size={16} /> : <SparkleIcon size={16} />}
      <Text
        fontFamily="mono"
        fontSize="10px"
        letterSpacing="0.5px"
        textTransform="uppercase"
      >
        {verified ? "Verified analysis" : "AI generated"}
      </Text>
    </Flex>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontWeight="medium"
      fontSize="12px"
      lineHeight="1.5"
      color="#3A4048"
      lineClamp={2}
    >
      {children}
    </Text>
  );
}

function CardDescription({ children }: { children: React.ReactNode }) {
  return (
    <Text fontFamily="mono" fontSize="10px" color="#656E7B" lineClamp={2}>
      {children}
    </Text>
  );
}

// --- Library card -------------------------------------------------------------

function LibraryCard({
  insight,
  verified,
  onAdd,
  actionLabel,
}: {
  insight: InsightWidget;
  verified: boolean;
  onAdd: () => void;
  /** Tooltip / aria-label for the window-pane action (add vs create). */
  actionLabel: string;
}) {
  return (
    <Box
      borderWidth="1px"
      borderColor="#DDE2F5"
      bg="#FFFFFF"
      rounded="4px"
      overflow="hidden"
      transition="border-color 0.15s ease, background 0.15s ease"
      _hover={{ bg: "#F0F4FF", borderColor: "#0049AA" }}
    >
      <Flex align="stretch">
        <Thumb type={insight.type} />
        <Flex flex="1 1 auto" minW={0} direction="column" px={4} py={3} gap={2}>
          <Flex justify="space-between" align="center" gap={2}>
            <TypeLabel verified={verified} />
            <Tooltip content={actionLabel} showArrow>
              <IconButton
                aria-label={actionLabel}
                size="2xs"
                variant="ghost"
                color="#4A64CB"
                flexShrink={0}
                onClick={onAdd}
              >
                <SquaresFourIcon size={16} />
              </IconButton>
            </Tooltip>
          </Flex>
          <CardTitle>{insight.title}</CardTitle>
          {insight.description && (
            <CardDescription>{insight.description}</CardDescription>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}

// --- Template card (curated starting point) ----------------------------------

function TemplateCard({
  template,
  onAdd,
}: {
  template: DashboardTemplate;
  onAdd: () => void;
}) {
  const { theme } = template;
  const Icon = template.icon;
  const count = template.widgets.length;
  return (
    <Box
      as="button"
      onClick={onAdd}
      textAlign="left"
      w="full"
      borderWidth="1px"
      borderColor={theme.border}
      bg={theme.bg}
      rounded="4px"
      overflow="hidden"
      cursor="pointer"
      transition="box-shadow 0.15s ease, transform 0.15s ease"
      _hover={{ boxShadow: "sm", transform: "translateY(-1px)" }}
    >
      <Flex align="stretch">
        <Flex
          w="72px"
          flexShrink={0}
          alignSelf="stretch"
          align="center"
          justify="center"
          borderRightWidth="1px"
          borderColor={theme.border}
          color={theme.eyebrow}
        >
          <Icon size={24} />
        </Flex>
        <Flex flex="1 1 auto" minW={0} direction="column" px={4} py={3} gap={1}>
          <Text
            fontFamily="mono"
            fontSize="10px"
            letterSpacing="0.5px"
            textTransform="uppercase"
            color={theme.eyebrow}
          >
            Template
          </Text>
          <Text
            fontWeight="medium"
            fontSize="12px"
            lineHeight="1.5"
            color={theme.fg}
            lineClamp={2}
          >
            {template.label}
          </Text>
          <Text fontFamily="mono" fontSize="10px" color={theme.eyebrow}>
            {count} {count === 1 ? "block" : "blocks"}
          </Text>
        </Flex>
      </Flex>
    </Box>
  );
}

// --- Panel -------------------------------------------------------------------

export default function DashboardInsightsPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const pathname = usePathname() ?? "";
  const match = pathname.match(/^\/dashboards\/(.+?)\/?$/);
  const dashboardId = match ? decodeURIComponent(match[1]) : null;
  const isDetail = !!dashboardId;

  const router = useRouter();
  const addWidget = useDashboardStore((s) => s.addWidget);
  // The dashboard being viewed (detail page), used to pre-scope the search to
  // its location. find() (not getDashboard) so the selector re-runs as the
  // store hydrates.
  const dashboard = useDashboardStore((s) =>
    dashboardId ? s.dashboards.find((d) => d.id === dashboardId) : undefined
  );
  const dashboardLocation = dashboard?.subtitle ?? dashboard?.title;

  const [source, setSource] = useState<SourceKey>("all");
  const [topic, setTopic] = useState("All");
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<ChartFamily | "all">("all");
  // Insights is the primary view; Templates is the secondary tab.
  const [tab, setTab] = useState<"templates" | "insights">("insights");
  // Pre-scope the search to the dashboard's location, shown as a removable chip.
  // Derived (not stored) so it follows hydration; clearing hides it until the
  // viewed dashboard changes.
  const [areaCleared, setAreaCleared] = useState(false);
  useEffect(() => setAreaCleared(false), [dashboardId]);
  const areaChip = areaCleared ? undefined : dashboardLocation;

  // Insights tab sources:
  //  • Verified — the curated default LIBRARY, grouped/filterable by topic.
  //  • AI generated — the user's real generative insights: persisted
  //    (GET /api/insights) + any generated live this session (insightStore),
  //    session-first, de-duplicated by id (falling back to title). No fixture
  //    fallback — an empty AI source surfaces an empty state.
  // "All" shows both, so the user always has the defaults to hand.
  const { insights: fetched, isLoading: insightsLoading } = useUserInsights();
  const generated = useInsightStore((s) => s.insights);
  const libraryTitles = new Set(LIBRARY.map((r) => r.insight.title));
  const seenKeys = new Set<string>();
  const aiInsights = [...generated, ...fetched].filter((i) => {
    if (!i || i.type === "dataset-card") return false;
    const key = i.id ?? i.title;
    // Skip anything that duplicates a curated default by title.
    if (libraryTitles.has(i.title) || seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  const verifiedEntries: LibEntry[] = LIBRARY.map((r) => ({
    insight: r.insight,
    verified: true,
    topic: r.topic,
  }));
  const aiEntries: LibEntry[] = aiInsights.map((insight) => ({
    insight,
    verified: false,
  }));

  let entries: LibEntry[];
  if (source === "verified") {
    entries = verifiedEntries.filter(
      (e) => topic === "All" || e.topic === topic
    );
  } else if (source === "ai") {
    entries = aiEntries;
  } else {
    entries = [...verifiedEntries, ...aiEntries];
  }

  // Area chip (dashboard location) pre-scopes the pool; then search + chart-type
  // narrow further. Chart-type chips reflect only the families present in the
  // scoped pool, so we never show one that would match nothing.
  const pool = areaChip
    ? entries.filter((e) => matchesQuery(e.insight, areaChip))
    : entries;
  const families = presentFamilies(pool.map((e) => e.insight));
  const activeFamily =
    family !== "all" && !families.includes(family) ? "all" : family;
  const visible = filterInsightEntries(pool, query, activeFamily);

  // The window-pane action differs by context: on a dashboard it adds the
  // analysis to that dashboard; on the gallery (no current dashboard) it spins
  // up a new one seeded with the analysis and navigates to it.
  const cardActionLabel = dashboardId
    ? "Add to this dashboard"
    : "Create a dashboard from this analysis";
  const onCardAction = (insight: InsightWidget, verified: boolean) => {
    if (dashboardId) {
      addWidget(dashboardId, { kind: "insight", span: 1, verified, insight });
      toaster.create({
        title: "Added to dashboard",
        description: insight.title,
        type: "success",
        duration: 2000,
      });
    } else {
      const id = createDashboardFromInsight(insight, verified);
      toaster.create({
        title: "Dashboard created",
        description: insight.title,
        type: "success",
        duration: 2000,
      });
      router.push(`/dashboards/${id}`);
    }
  };

  // Append a curated template's blocks to the dashboard. Once it has widgets the
  // setup dock auto-collapses, so this also "finishes" the creation flow.
  const applyTemplate = (template: DashboardTemplate) => {
    if (!dashboardId) return;
    template.widgets.forEach((wgt) => addWidget(dashboardId, wgt));
    toaster.create({
      title: "Template added",
      description: template.title,
      type: "success",
      duration: 2000,
    });
  };

  return (
    <Flex
      flexDir="column"
      h="100%"
      w="100%"
      {...chatPanelCardStyle}
      borderRadius={0}
      borderWidth={0}
      borderRightWidth={{ base: 0, md: "1px" }}
      bg="bg"
    >
      {/* Header */}
      <Flex
        h="40px"
        px={3}
        align="center"
        justify="space-between"
        borderBottomWidth="1px"
        borderColor="border"
        flexShrink={0}
      >
        <Flex align="center" gap={2} color="neutral.500">
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
          color="neutral.500"
          onClick={onClose}
        >
          <XIcon size={16} />
        </IconButton>
      </Flex>

      {/* Body */}
      <Box flex="1 1 auto" overflowY="auto" px={4} py={3}>
        {/* Templates only make sense on a dashboard (they append blocks to it);
            the gallery goes straight to the insight library. */}
        {isDetail && (
          <Flex gap={2} mb={3} flexWrap="wrap">
            <FilterPill
              active={tab === "insights"}
              onClick={() => setTab("insights")}
            >
              Insights
            </FilterPill>
            <FilterPill
              active={tab === "templates"}
              onClick={() => setTab("templates")}
            >
              Templates
            </FilterPill>
          </Flex>
        )}

        {isDetail && tab === "templates" ? (
          <Flex flexDir="column" gap={2}>
            {TEMPLATES.map((t) => (
              <TemplateCard
                key={t.key}
                template={t}
                onAdd={() => applyTemplate(t)}
              />
            ))}
          </Flex>
        ) : (
          <>
            {/* Source: curated defaults (Verified) + your generative insights
                (AI generated). "All" shows both. */}
            <Flex gap={2} mb={source === "verified" ? 2 : 3} flexWrap="wrap">
              {SOURCE_FILTERS.map((s) => (
                <FilterPill
                  key={s.key}
                  active={source === s.key}
                  onClick={() => setSource(s.key)}
                >
                  {s.label}
                </FilterPill>
              ))}
            </Flex>
            {/* Topic filter for the curated defaults. */}
            {source === "verified" && (
              <Flex gap={2} mb={3} pl={3} flexWrap="wrap">
                {["All", ...VERIFIED_TOPICS].map((t) => (
                  <FilterPill
                    key={t}
                    active={topic === t}
                    onClick={() => setTopic(t)}
                  >
                    {t}
                  </FilterPill>
                ))}
              </Flex>
            )}
            {/* Search — pre-scoped to the dashboard's location as a removable
                chip on detail pages. */}
            <Flex
              align="center"
              gap={1.5}
              mb={3}
              h="32px"
              px={2}
              borderWidth="1px"
              borderColor="border"
              rounded="md"
              bg="bg"
              _focusWithin={{
                borderColor: "primary.500",
                boxShadow: "0 0 0 1px var(--chakra-colors-primary-500)",
              }}
            >
              <Box color="fg.muted" flexShrink={0} display="flex">
                <MagnifyingGlassIcon size={16} />
              </Box>
              {areaChip && (
                <Flex
                  align="center"
                  gap={1}
                  flexShrink={0}
                  maxW="150px"
                  bg="#EAF0FF"
                  color="#0049AA"
                  rounded="full"
                  pl={2}
                  pr={0.5}
                  py="2px"
                  fontSize="11px"
                  fontWeight="500"
                >
                  <Text lineClamp={1}>{areaChip}</Text>
                  <IconButton
                    aria-label={`Clear ${areaChip} filter`}
                    size="2xs"
                    variant="ghost"
                    h="16px"
                    minW="16px"
                    w="16px"
                    color="#0049AA"
                    onClick={() => setAreaCleared(true)}
                  >
                    <XIcon size={10} />
                  </IconButton>
                </Flex>
              )}
              <Input
                flex="1"
                minW={0}
                border="none"
                p={0}
                h="full"
                fontSize="sm"
                _focusVisible={{ boxShadow: "none" }}
                placeholder={areaChip ? "Search within…" : "Search analyses…"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </Flex>
            {/* Chart-type filter — only families present in the source. */}
            {families.length > 0 && (
              <Flex gap={2} mb={3} flexWrap="wrap">
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

            {insightsLoading && entries.length === 0 ? (
              <Flex
                align="center"
                gap={2}
                color="fg.muted"
                fontSize="sm"
                py={6}
              >
                <Spinner size="xs" />
                Loading your insights…
              </Flex>
            ) : entries.length === 0 ? (
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
                <Text fontSize="sm" fontWeight="medium" color="fg">
                  No insights yet
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  Insights you generate in conversations will appear here, ready
                  to add to a dashboard.
                </Text>
              </Flex>
            ) : visible.length === 0 ? (
              <Text fontSize="sm" color="fg.muted" py={6} textAlign="center">
                No analyses match your search.
              </Text>
            ) : (
              <Flex flexDir="column" gap={2}>
                {visible.map((e, i) => (
                  <LibraryCard
                    key={
                      e.insight.id ?? `${e.verified}-${e.insight.title}-${i}`
                    }
                    insight={e.insight}
                    verified={e.verified}
                    actionLabel={cardActionLabel}
                    onAdd={() => onCardAction(e.insight, e.verified)}
                  />
                ))}
              </Flex>
            )}
          </>
        )}
      </Box>
    </Flex>
  );
}
