"use client";

import { useRef, useState } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  IconButton,
  useDisclosure,
} from "@chakra-ui/react";
import {
  ArrowsOutCardinalIcon,
  ArrowsOutIcon,
  ArrowsInIcon,
  TrashIcon,
  ChartBarIcon,
  TableIcon,
  MapTrifoldIcon,
  CheckCircleIcon,
  SparkleIcon,
  MicroscopeIcon,
  DownloadSimpleIcon,
  ChatCircleIcon,
} from "@phosphor-icons/react";
import ChartWidget from "@/app/components/widgets/ChartWidget";
import TableWidget from "@/app/components/widgets/TableWidget";
import ScrollableTableWrapper from "@/app/components/widgets/ScrollableTableWrapper";
import WidgetErrorBoundary from "@/app/components/widgets/WidgetErrorBoundary";
import InsightProvenanceDrawer from "@/app/components/InsightProvenanceDrawer";
import MapWidgetPlaceholder from "@/app/dashboards/components/MapWidgetPlaceholder";
import { Tooltip } from "@/app/components/ui/tooltip";
import useComposerStore from "@/app/dashboards/lib/composerStore";
import type { DashboardWidget } from "@/app/types/dashboard";

type View = "chart" | "table" | "map";

const CHART_TYPES = new Set([
  "bar",
  "stacked-bar",
  "grouped-bar",
  "line",
  "area",
  "pie",
  "scatter",
]);

function downloadCsv(title: string, data: unknown) {
  if (!Array.isArray(data) || data.length === 0) return;
  const rows = data as Record<string, unknown>[];
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const v = row[h];
          const s = v === null || v === undefined ? "" : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface DashboardInsightCardProps {
  widget: DashboardWidget; // kind === "insight"
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  /** Spread onto the Arrange handle so the grid can start a drag from it. */
  arrange?: {
    onMouseDown?: () => void;
    onMouseUp?: () => void;
  };
}

export default function DashboardInsightCard({
  widget,
  expanded,
  onToggleExpand,
  onDelete,
  arrange,
}: DashboardInsightCardProps) {
  const insight = widget.insight!;
  const isChartType = CHART_TYPES.has(insight.type);
  const hasData = Array.isArray(insight.data) && insight.data.length > 0;
  const [view, setView] = useState<View>(isChartType ? "chart" : "table");
  const [hovered, setHovered] = useState(false);
  const provenance = useDisclosure();
  const verified = widget.verified;
  const addMention = useComposerStore((s) => s.addMention);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  // Mention fires when clicking the outer (blue) container — its header/frame —
  // but never the inner white chart area (data-nomention) or any control. A
  // small label tracks the cursor across that mentionable area.
  const overControl = (target: EventTarget | null) =>
    !!(target as HTMLElement | null)?.closest(
      "button, a, input, textarea, select, [role='button'], [data-nomention]"
    );

  const handleMove = (e: React.MouseEvent) => {
    const wrap = wrapperRef.current;
    const cur = cursorRef.current;
    if (!wrap || !cur) return;
    if (overControl(e.target)) {
      cur.style.opacity = "0";
      wrap.style.cursor = "";
      return;
    }
    const rect = wrap.getBoundingClientRect();
    cur.style.left = `${e.clientX - rect.left}px`;
    cur.style.top = `${e.clientY - rect.top}px`;
    cur.style.opacity = "1";
    wrap.style.cursor = "pointer";
  };

  const handleLeave = () => {
    setHovered(false);
    if (cursorRef.current) cursorRef.current.style.opacity = "0";
  };

  const handleClick = (e: React.MouseEvent) => {
    if (overControl(e.target)) return;
    addMention(insight.title);
  };

  const VIEWS: { key: View; label: string; icon: React.ElementType }[] = [
    ...(isChartType
      ? [{ key: "chart" as View, label: "Chart", icon: ChartBarIcon }]
      : []),
    { key: "table", label: "Table", icon: TableIcon },
    { key: "map", label: "Map", icon: MapTrifoldIcon },
  ];

  return (
    <Box
      ref={wrapperRef}
      position="relative"
      h="100%"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
      onClick={handleClick}
    >
      {/* Outer container (light blue) — title + controls live here; clicking
          this frame mentions the insight. */}
      <Box
        rounded="4px"
        borderWidth="1px"
        borderColor={hovered ? "#0049AA" : "#DDE2F5"}
        boxShadow={hovered ? "md" : undefined}
        bg="#F7F9FF"
        h="100%"
        p={3}
        display="flex"
        flexDirection="column"
        gap={3}
        transition="border-color 0.15s ease, box-shadow 0.15s ease"
      >
        {/* Header: title + per-widget controls */}
        <Flex justify="space-between" align="flex-start" gap={2}>
          <Text
            fontWeight="medium"
            fontSize="14px"
            lineHeight="16px"
            color="#172B7A"
            lineClamp={2}
            minW={0}
          >
            {insight.title}
          </Text>
          <Flex gap={0.5} flexShrink={0} align="center" color="neutral.500">
            <Tooltip content="Drag to reorder" showArrow>
              <IconButton
                aria-label="Drag to reorder"
                size="2xs"
                variant="ghost"
                cursor="grab"
                onMouseDown={arrange?.onMouseDown}
                onMouseUp={arrange?.onMouseUp}
              >
                <ArrowsOutCardinalIcon size={14} />
              </IconButton>
            </Tooltip>
            <Tooltip
              content={
                expanded ? "Collapse to one column" : "Expand to full width"
              }
              showArrow
            >
              <IconButton
                aria-label="Toggle width"
                size="2xs"
                variant="ghost"
                onClick={onToggleExpand}
              >
                {expanded ? (
                  <ArrowsInIcon size={14} />
                ) : (
                  <ArrowsOutIcon size={14} />
                )}
              </IconButton>
            </Tooltip>
            <IconButton
              aria-label="Remove insight"
              size="2xs"
              variant="ghost"
              onClick={onDelete}
            >
              <TrashIcon size={14} />
            </IconButton>
          </Flex>
        </Flex>

        {/* White chart area — chart, disclaimer + controls; excluded from
            the mention click target. */}
        <Box
          data-nomention="true"
          bg="#FFFFFF"
          borderWidth="1px"
          borderColor="#DDE2F5"
          rounded="4px"
          overflow="hidden"
          p={3}
          display="flex"
          flexDirection="column"
          gap={3}
        >
          {/* Verified / AI-assisted disclaimer */}
          <Flex
            align="center"
            gap={1}
            color={verified ? "#8E9954" : "neutral.500"}
          >
            {verified ? (
              <CheckCircleIcon size={13} weight="fill" />
            ) : (
              <SparkleIcon size={13} weight="fill" />
            )}
            <Text
              fontFamily="mono"
              fontSize="10px"
              letterSpacing="0.3px"
              textTransform="uppercase"
            >
              {verified ? "Verified" : "AI-assisted"}
            </Text>
            <Text fontSize="10px" color="fg.muted">
              · Learn more
            </Text>
          </Flex>

          {/* View toggle: Chart | Table | Map */}
          <Flex
            gap={0}
            borderWidth="1px"
            borderColor="border.emphasized"
            rounded="md"
            overflow="hidden"
            w="fit-content"
            role="group"
            aria-label="View"
          >
            {VIEWS.map((v) => {
              const active = view === v.key;
              return (
                <Button
                  key={v.key}
                  size="xs"
                  h={6}
                  rounded="none"
                  fontWeight="medium"
                  variant={active ? "solid" : "ghost"}
                  colorPalette={active ? "primary" : undefined}
                  onClick={() => setView(v.key)}
                  aria-pressed={active}
                >
                  <v.icon size={14} />
                  {v.label}
                </Button>
              );
            })}
          </Flex>

          {/* Body */}
          {view === "chart" && (
            <WidgetErrorBoundary fallbackTitle="Unable to render chart">
              <ChartWidget widget={insight} />
            </WidgetErrorBoundary>
          )}
          {view === "table" && (
            <WidgetErrorBoundary fallbackTitle="Unable to render table">
              <ScrollableTableWrapper>
                <TableWidget
                  data={
                    insight.data as Record<string, string | number | boolean>[]
                  }
                  caption={insight.title}
                />
              </ScrollableTableWrapper>
            </WidgetErrorBoundary>
          )}
          {view === "map" && (
            <MapWidgetPlaceholder
              map={{ caption: insight.title, alertCount: 120 }}
              height="220px"
            />
          )}

          {/* Actions */}
          {hasData && (
            <Flex gap={2} align="center" flexWrap="wrap">
              {insight.generation && (
                <Button
                  size="xs"
                  variant="outline"
                  h={6}
                  rounded="sm"
                  color="neutral.500"
                  onClick={provenance.onOpen}
                >
                  <MicroscopeIcon size={12} />
                  View how this was generated
                </Button>
              )}
              <Button
                size="xs"
                variant="outline"
                h={6}
                rounded="sm"
                color="neutral.500"
                onClick={() =>
                  downloadCsv(insight.title || "data", insight.data)
                }
              >
                <DownloadSimpleIcon size={14} />
                Download
              </Button>
            </Flex>
          )}
        </Box>
      </Box>

      {/* Mention affordance — a small label that tracks the cursor over the
          insight's non-UI areas. Clicking those areas mentions it in chat. */}
      <Flex
        ref={cursorRef}
        position="absolute"
        top={0}
        left={0}
        transform="translate(14px, 14px)"
        align="center"
        gap={1.5}
        px={2.5}
        py={1}
        bg="fg.link"
        color="#FFFFFF"
        rounded="md"
        fontSize="xs"
        fontWeight="light"
        whiteSpace="nowrap"
        boxShadow="md"
        pointerEvents="none"
        opacity={0}
        zIndex={3}
        transition="opacity 0.12s ease"
      >
        <ChatCircleIcon size={16} />
        Ask AI...
      </Flex>

      <InsightProvenanceDrawer
        isOpen={provenance.open}
        onClose={provenance.onClose}
        generation={insight.generation}
        title={insight.title}
      />
    </Box>
  );
}
