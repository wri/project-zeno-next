"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Box, Flex, Text, IconButton, Switch } from "@chakra-ui/react";
import {
  ChartLineIcon,
  ChartBarIcon,
  ChartPieSliceIcon,
  TableIcon,
  XIcon,
  CheckCircleIcon,
  SparkleIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { chatPanelCardStyle } from "@/app/chatPanelShared";
import useDashboardStore from "@/app/store/dashboardStore";
import { WIDGET_FIXTURES } from "@/app/dashboards/lib/fixtures";
import { Tooltip } from "@/app/components/ui/tooltip";
import { toaster } from "@/app/components/ui/toaster";
import type { InsightWidget } from "@/app/types/chat";

type FilterKey = "conversation" | "verified" | "ai";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "conversation", label: "In this conversation" },
  { key: "verified", label: "Verified" },
  { key: "ai", label: "AI generated" },
];

/** Verified analyses grouped into high-level topics for the panel filter. */
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

const TOPICS = ["All", ...Array.from(new Set(LIBRARY.map((r) => r.topic)))];

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

// --- Gallery card (with Show-on-map) -----------------------------------------

interface GalleryItem {
  id: string;
  insight: InsightWidget;
  source: "verified" | "ai";
}

function GalleryCard({
  item,
  shown,
  onToggle,
}: {
  item: GalleryItem;
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <Box
      borderWidth="1px"
      borderColor={shown ? "#0049AA" : "#DDE2F5"}
      bg={shown ? "#DDE2F5" : "#FFFFFF"}
      rounded="4px"
      overflow="hidden"
      transition="border-color 0.15s ease, background 0.15s ease"
      _hover={shown ? undefined : { bg: "#F0F4FF", borderColor: "#0049AA" }}
    >
      <Flex align="stretch">
        <Thumb type={item.insight.type} />
        <Flex flex="1 1 auto" minW={0} direction="column" px={4} py={3} gap={2}>
          <TypeLabel verified={item.source === "verified"} />
          <CardTitle>{item.insight.title}</CardTitle>
          {item.insight.description && (
            <CardDescription>{item.insight.description}</CardDescription>
          )}
          <Box h="1px" bg="#BBC5EB" />
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
            <Switch.Label fontSize="12px" color="#4A64CB">
              Show on map
            </Switch.Label>
          </Switch.Root>
        </Flex>
      </Flex>
    </Box>
  );
}

// --- Library card (with Add-to-dashboard) ------------------------------------

function LibraryCard({
  insight,
  onAdd,
}: {
  insight: InsightWidget;
  onAdd: () => void;
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
            <TypeLabel verified />
            <Tooltip content="Add to this dashboard" showArrow>
              <IconButton
                aria-label="Add to dashboard"
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

  const dashboards = useDashboardStore((s) => s.dashboards);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const [filter, setFilter] = useState<FilterKey>("conversation");
  const [topic, setTopic] = useState("All");
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());

  // Gallery items: all analyses across dashboards.
  const galleryItems: GalleryItem[] = dashboards.flatMap((d) =>
    d.widgets
      .filter((wgt) => wgt.kind === "insight" && wgt.insight)
      .map((wgt, i) => ({
        id: wgt.id,
        insight: wgt.insight as InsightWidget,
        source: ((wgt.verified ?? i % 2 === 0) ? "verified" : "ai") as
          | "verified"
          | "ai",
      }))
  );
  const filteredGallery = galleryItems.filter((it) => {
    if (filter === "verified") return it.source === "verified";
    if (filter === "ai") return it.source === "ai";
    return true;
  });

  // Detail: verified library filtered by topic (dataset).
  const filteredLibrary = LIBRARY.filter(
    (r) => topic === "All" || r.topic === topic
  );

  const toggleShown = (id: string) =>
    setShownIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addToDashboard = (insight: InsightWidget) => {
    if (!dashboardId) return;
    addWidget(dashboardId, {
      kind: "insight",
      span: 1,
      verified: true,
      insight,
    });
    toaster.create({
      title: "Added to dashboard",
      description: insight.title,
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
        {isDetail ? (
          // Topic filter + flat list of verified analyses to add
          <>
            <Flex gap={2} mb={3} flexWrap="wrap">
              {TOPICS.map((t) => (
                <FilterPill
                  key={t}
                  active={topic === t}
                  onClick={() => setTopic(t)}
                >
                  {t}
                </FilterPill>
              ))}
            </Flex>
            <Flex flexDir="column" gap={2}>
              {filteredLibrary.map((r) => (
                <LibraryCard
                  key={r.insight.title}
                  insight={r.insight}
                  onAdd={() => addToDashboard(r.insight)}
                />
              ))}
            </Flex>
          </>
        ) : (
          // Gallery: source filter + cards with show-on-map
          <>
            <Flex gap={2} mb={3} flexWrap="wrap">
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
            {filteredGallery.length === 0 ? (
              <Text fontSize="sm" color="fg.muted" py={6} textAlign="center">
                No analyses to show.
              </Text>
            ) : (
              <Flex flexDir="column" gap={3}>
                {filteredGallery.map((it) => (
                  <GalleryCard
                    key={it.id}
                    item={it}
                    shown={shownIds.has(it.id)}
                    onToggle={() => toggleShown(it.id)}
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
