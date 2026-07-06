"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Flex,
  IconButton,
  Input,
  InputGroup,
  Spinner,
  Switch,
  Text,
} from "@chakra-ui/react";
import {
  ChartBarIcon,
  ChartLineIcon,
  ChartPieSliceIcon,
  MagnifyingGlassIcon,
  TableIcon,
  XIcon,
} from "@phosphor-icons/react";

import { chatPanelCardStyle } from "@/app/chatPanelShared";
import { useUserInsights } from "@/app/hooks/useUserInsights";
import { useAddWidget, useRemoveWidget } from "@/app/hooks/useDashboards";
import {
  CHART_FAMILY_LABEL,
  chartFamily,
  matchesQuery,
  presentFamilies,
  type ChartFamily,
} from "@/app/utils/insightFilters";
import type { Dashboard } from "@/app/schemas/api/dashboards/get";
import type { InsightWidget } from "@/app/types/chat";
import useComposerStore from "@/app/store/composerStore";

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

/** Rounded pill used for the chart-family filters. */
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
      px={2.5}
      py={0.5}
      rounded="full"
      fontSize="xs"
      borderWidth="1px"
      borderColor={active ? "primary.solid" : "border.emphasized"}
      bg={active ? "primary.subtle" : "bg"}
      color={active ? "primary.fg" : "fg.muted"}
      cursor="pointer"
      _hover={{ borderColor: "primary.solid" }}
    >
      {children}
    </Box>
  );
}

// One row per persisted insight (an insight owns several charts; the toggle
// adds the whole insight as one dashboard widget).
interface InsightEntry {
  insightId: string;
  first: InsightWidget;
  chartCount: number;
}

/**
 * The "Analyses" side panel on a dashboard: the user's saved insights
 * (GET /api/insights) with an add-to-dashboard toggle per insight — a plain
 * POST/DELETE on the dashboard's widgets, no chat round trip.
 */
export default function DashboardInsightsPanel({
  dashboard,
}: {
  dashboard: Dashboard;
}) {
  const closeSidePane = useComposerStore((s) => s.closeSidePane);
  const { insights, isLoading } = useUserInsights();
  const addWidget = useAddWidget(dashboard.id);
  const removeWidget = useRemoveWidget(dashboard.id);

  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<ChartFamily | "all">("all");

  // Group the flat chart widgets back into one entry per insight.
  const entries = useMemo<InsightEntry[]>(() => {
    const byInsight = new Map<string, InsightWidget[]>();
    for (const widget of insights) {
      if (!widget.insightId) continue;
      const list = byInsight.get(widget.insightId) ?? [];
      list.push(widget);
      byInsight.set(widget.insightId, list);
    }
    return [...byInsight.entries()].map(([insightId, widgets]) => ({
      insightId,
      first: widgets[0],
      chartCount: widgets.length,
    }));
  }, [insights]);

  const families = useMemo(
    () => presentFamilies(entries.map((e) => e.first)),
    [entries]
  );

  const visible = entries.filter(
    (e) =>
      matchesQuery(e.first, query) &&
      (family === "all" || chartFamily(e.first.type) === family)
  );

  // Which insights are already on this dashboard (insight_id → widget id).
  const widgetByInsightId = useMemo(() => {
    const map = new Map<string, string>();
    for (const widget of dashboard.widgets) {
      if (widget.widget_type === "insight" && widget.insight_id) {
        map.set(widget.insight_id, widget.id);
      }
    }
    return map;
  }, [dashboard.widgets]);

  const busy = addWidget.isPending || removeWidget.isPending;

  const toggle = (insightId: string) => {
    const widgetId = widgetByInsightId.get(insightId);
    if (widgetId) {
      removeWidget.mutate(widgetId);
    } else {
      addWidget.mutate({ widget_type: "insight", insight_id: insightId });
    }
  };

  return (
    <Flex
      flexDir="column"
      h="100%"
      w="full"
      {...chatPanelCardStyle}
      borderRadius={0}
      borderWidth={0}
    >
      {/* Header */}
      <Flex
        h="40px"
        px="3"
        bg="#F4F5F6"
        borderBottomWidth="1px"
        borderColor="#E7E6E6"
        align="center"
        justify="space-between"
        flexShrink={0}
      >
        <Text
          fontFamily="mono"
          fontSize="10px"
          lineHeight="16px"
          letterSpacing="0.3px"
          textTransform="uppercase"
          color="#656E7B"
        >
          Analyses
        </Text>
        <IconButton
          aria-label="Close analyses panel"
          size="2xs"
          variant="ghost"
          color="#656E7B"
          onClick={closeSidePane}
        >
          <XIcon size={14} />
        </IconButton>
      </Flex>

      {/* Search + filters */}
      <Box px={3} pt={3} flexShrink={0}>
        <InputGroup endElement={<MagnifyingGlassIcon size={14} />}>
          <Input
            size="sm"
            placeholder="Search analyses…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
        {families.length > 1 && (
          <Flex gap={1.5} wrap="wrap" mt={2}>
            <FilterPill
              active={family === "all"}
              onClick={() => setFamily("all")}
            >
              All
            </FilterPill>
            {families.map((f) => (
              <FilterPill
                key={f}
                active={family === f}
                onClick={() => setFamily(f)}
              >
                {CHART_FAMILY_LABEL[f]}
              </FilterPill>
            ))}
          </Flex>
        )}
      </Box>

      {/* List */}
      <Box flex="1 1 auto" overflowY="auto" px={3} py={3}>
        {isLoading ? (
          <Flex justify="center" py={10}>
            <Spinner size="sm" />
          </Flex>
        ) : visible.length === 0 ? (
          <Text fontSize="sm" color="fg.muted" textAlign="center" py={10}>
            {entries.length === 0
              ? "No analyses yet — ask the assistant to analyse this area and they will appear here."
              : "No analyses match your search."}
          </Text>
        ) : (
          <Flex direction="column" gap={2}>
            {visible.map((entry) => {
              const Icon = TYPE_ICON[entry.first.type] ?? ChartBarIcon;
              const onDashboard = widgetByInsightId.has(entry.insightId);
              return (
                <Flex
                  key={entry.insightId}
                  gap={2.5}
                  p={2.5}
                  borderWidth="1px"
                  borderColor={onDashboard ? "primary.muted" : "border"}
                  bg={onDashboard ? "primary.subtle" : "bg"}
                  rounded="md"
                  align="flex-start"
                >
                  <Flex
                    w="32px"
                    h="32px"
                    rounded="md"
                    bg="bg.subtle"
                    align="center"
                    justify="center"
                    flexShrink={0}
                    color="fg.muted"
                  >
                    <Icon size={16} />
                  </Flex>
                  <Box minW={0} flex="1">
                    <Text fontSize="sm" fontWeight="medium" lineClamp={2}>
                      {entry.first.title}
                    </Text>
                    {entry.chartCount > 1 && (
                      <Text fontSize="xs" color="fg.muted">
                        {entry.chartCount} charts
                      </Text>
                    )}
                    <Switch.Root
                      size="sm"
                      mt={1.5}
                      checked={onDashboard}
                      disabled={busy}
                      onCheckedChange={() => toggle(entry.insightId)}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                      <Switch.Label fontSize="xs" color="fg.muted">
                        Add to dashboard
                      </Switch.Label>
                    </Switch.Root>
                  </Box>
                </Flex>
              );
            })}
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
