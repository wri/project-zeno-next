"use client";
import { useState } from "react";
import {
  Box,
  Heading,
  Flex,
  Separator,
  Button,
  Dialog,
  Portal,
  CloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import {
  MicroscopeIcon as Microscope,
  ArrowsOutIcon,
  DownloadSimpleIcon,
  TableIcon,
  ChartBarIcon,
  PushPinIcon,
} from "@phosphor-icons/react";
import { InsightWidget, DatasetInfo } from "@/app/types/chat";
import TableWidget from "./widgets/TableWidget";
import DatasetCardWidget from "./widgets/DatasetCardWidget";
import ChartWidget from "./widgets/ChartWidget";
import { WidgetIcons } from "../ChatPanelHeader";
import InsightProvenanceDrawer from "./InsightProvenanceDrawer";
import VisualizationDisclaimer from "./VisualizationDisclaimer";
import WidgetErrorBoundary from "./widgets/WidgetErrorBoundary";
import ScrollableTableWrapper from "./widgets/ScrollableTableWrapper";
import useInsightStore, { buildAoiKey } from "@/app/store/insightStore";
import useContextStore from "@/app/store/contextStore";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import { toaster } from "./ui/toaster";
import { isPinnable, toChartType } from "@/app/lib/portfolio/chartTypeMap";
import type { PinnedAoi } from "@/app/types/portfolio";
import type { AOI } from "@/app/types/chat";
import type { FeatureCollection, Feature } from "geojson";

interface WidgetMessageProps {
  widget: InsightWidget;
}

export default function WidgetMessage({ widget }: WidgetMessageProps) {
  const [showAsTable, setShowAsTable] = useState(false);
  const { open, onOpen, onClose } = useDisclosure();
  const {
    open: expanded,
    onOpen: onExpand,
    onClose: onCollapse,
  } = useDisclosure();
  // These two subscriptions feed the "Pin / Pinned" active state below.
  // They must run unconditionally so we keep them before the dataset-card
  // early return — dataset-card widgets aren't pinnable but the hooks still
  // need to be called.
  const insights = useInsightStore((s) => s.insights);
  const removeInsight = useInsightStore((s) => s.removeInsight);
  const contextItems = useContextStore((s) => s.context);
  if (widget.type === "dataset-card") {
    return <DatasetCardWidget dataset={widget.data as DatasetInfo} />;
  }

  const handleOpen = () => {
    onOpen();
  };

  const handleDownloadCsv = () => {
    const data = widget.data;
    if (!Array.isArray(data) || data.length === 0) return;
    const rows = data as Record<string, unknown>[];
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            const str = val === null || val === undefined ? "" : String(val);
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(",")
      ),
    ];
    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(widget.title || "data").replace(/[^a-z0-9]/gi, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartTypes: InsightWidget["type"][] = [
    "bar",
    "stacked-bar",
    "grouped-bar",
    "line",
    "area",
    "pie",
    "scatter",
  ];
  const isChartType = chartTypes.includes(widget.type);
  const hasData = Array.isArray(widget.data) && widget.data.length > 0;
  const showDisclaimer = (isChartType || widget.type === "table") && hasData;

  // Compute the dedupe key from the live context. Reactivity is driven by
  // the insights / contextItems subscriptions established before the
  // dataset-card early return above.
  const currentPinKey = (() => {
    const areaCtx = contextItems.find((c) => c.contextType === "area");
    const selection = areaCtx?.aoiSelection;
    const aoiName =
      selection?.name ??
      (typeof areaCtx?.content === "string" ? areaCtx.content : undefined) ??
      "No area";
    const src_ids = (selection?.aois ?? [])
      .map((a) => a.src_id)
      .filter((s): s is string => Boolean(s));
    return buildAoiKey(src_ids, aoiName);
  })();
  const existingPin = insights.find((i) => {
    const otherKey = buildAoiKey(i.aoi.src_ids, i.aoi.name);
    return (
      i.title === widget.title &&
      otherKey === currentPinKey &&
      (i.datasetName ?? "") === (widget.datasetName ?? "")
    );
  });
  const isPinned = Boolean(existingPin);

  const handlePinToggle = () => {
    if (!isPinnable(widget.type)) return;

    if (existingPin) {
      removeInsight(existingPin.id);
      toaster.create({
        title: "Removed from inbox",
        description: widget.title,
        type: "info",
        duration: 2000,
      });
      return;
    }

    const ctxStore = useContextStore.getState();
    const chatStoreState = useChatStore.getState();
    const mapState = useMapStore.getState();

    // Find an AOI snapshot from the active context. AOIs aren't required to
    // pin (the inbox tolerates "No area"), but when available we capture the
    // full selection so multi-area insights round-trip correctly.
    const areaCtx = ctxStore.context.find((c) => c.contextType === "area");
    const selection = areaCtx?.aoiSelection;
    const firstAoi: AOI | undefined = selection?.aois?.[0];
    const aoiName =
      selection?.name ??
      (typeof areaCtx?.content === "string" ? areaCtx.content : undefined) ??
      "No area";
    const isMulti = (selection?.aois?.length ?? 0) > 1;
    const src_ids = (selection?.aois ?? [])
      .map((a) => a.src_id)
      .filter((s): s is string => Boolean(s));

    // Pull the geometry snapshot from the geoJsonRegistry — registered by
    // pickAoiTool when the AOI was selected. For multi-AOI we merge feature
    // collections so the dashboard map card can render the union.
    const aois = selection?.aois ?? [];
    const collected: Feature[] = [];
    aois.forEach((a) => {
      const entry = mapState.geoJsonRegistry.find(
        (e) => e.ref.name === a.name && e.ref.source === a.source
      );
      if (!entry) return;
      if (entry.data.type === "FeatureCollection") {
        collected.push(...entry.data.features);
      } else if (entry.data.type === "Feature") {
        collected.push(entry.data);
      }
    });
    const geometry: FeatureCollection | undefined =
      collected.length > 0
        ? { type: "FeatureCollection", features: collected }
        : undefined;

    const aoi: PinnedAoi = {
      name: aoiName,
      src_ids,
      source: firstAoi?.source ?? "unknown",
      isMultiArea: isMulti,
      bbox: firstAoi?.bbox,
      geometry,
    };

    useInsightStore.getState().addInsight({
      title: widget.title,
      description: widget.description,
      datasetName: widget.datasetName,
      chartType: toChartType(widget.type),
      aoi,
      threadId: chatStoreState.currentThreadId ?? undefined,
      data: widget.data,
      xAxis: widget.xAxis,
      yAxis: widget.yAxis,
    });

    toaster.create({
      title: "Saved to inbox",
      description: widget.title,
      type: "success",
      duration: 2000,
    });
  };
  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor="blue.fg"
      overflow="hidden"
    >
      <Flex px={4} py={3} gap={2} bgGradient="LCLGradientLight">
        {WidgetIcons[widget.type]}
        <Heading size="xs" fontWeight="medium" color="primary.fg" m={0}>
          {widget.title}
        </Heading>
      </Flex>
      <Flex gap={3} px={4} py={3} flexDir="column">
        {hasData && <Separator />}
        {/* Toolbar row — segmented toggle + full-screen */}
        <Flex justify="flex-start" gap={2} flexWrap="wrap" align="center">
          {/* Segmented Chart / Table toggle */}
          {isChartType && hasData && (
            <Flex
              gap={0}
              border="1px solid"
              borderColor="border.emphasized"
              rounded="md"
              overflow="hidden"
            >
              <Button
                size="xs"
                variant={!showAsTable ? "solid" : "ghost"}
                colorPalette={!showAsTable ? "primary" : undefined}
                onClick={() => setShowAsTable(false)}
                h={6}
                rounded="none"
                fontWeight="medium"
              >
                <ChartBarIcon size={14} />
                Chart
              </Button>
              <Button
                size="xs"
                variant={showAsTable ? "solid" : "ghost"}
                colorPalette={showAsTable ? "primary" : undefined}
                onClick={() => setShowAsTable(true)}
                h={6}
                rounded="none"
                fontWeight="medium"
              >
                <TableIcon size={14} />
                Table
              </Button>
            </Flex>
          )}
          {/* Show full-screen */}
          {isChartType && hasData && (
            <Button
              size="xs"
              variant="outline"
              onClick={onExpand}
              h={6}
              rounded="sm"
            >
              <ArrowsOutIcon size={14} />
              Show full-screen
            </Button>
          )}
        </Flex>
        {isChartType && !showAsTable && (
          <WidgetErrorBoundary fallbackTitle="Unable to render chart">
            <ChartWidget widget={widget} />
          </WidgetErrorBoundary>
        )}
        {isChartType && showAsTable && Array.isArray(widget.data) && (
          <WidgetErrorBoundary fallbackTitle="Unable to render table">
            <ScrollableTableWrapper>
              <TableWidget
                data={
                  widget.data as Record<string, string | number | boolean>[]
                }
                caption={widget.title}
              />
            </ScrollableTableWrapper>
          </WidgetErrorBoundary>
        )}

        {widget.type === "table" && (
          <WidgetErrorBoundary fallbackTitle="Unable to render table">
            <ScrollableTableWrapper>
              <TableWidget
                data={
                  widget.data as Record<string, string | number | boolean>[]
                }
                caption={widget.title}
              />
            </ScrollableTableWrapper>
          </WidgetErrorBoundary>
        )}
        {/* Bottom action row — provenance + download */}
        {(isChartType || widget.type === "table") && hasData && (
          <Flex justify="flex-start" gap={2} flexWrap="wrap" align="center">
            {widget.generation && (
              <Button
                size="xs"
                variant="outline"
                onClick={handleOpen}
                bg={open ? "bg.info" : undefined}
                borderColor={open ? "border.info" : undefined}
                color={open ? "fg.info" : undefined}
                h={6}
                rounded="sm"
                _hover={{
                  bg: open ? "blue.100" : undefined,
                }}
              >
                <Microscope />
                View how this was generated
              </Button>
            )}
            <Button
              size="xs"
              variant="outline"
              onClick={handleDownloadCsv}
              h={6}
              rounded="sm"
            >
              <DownloadSimpleIcon size={14} />
              Download CSV
            </Button>
            {isPinnable(widget.type) && (
              <Button
                size="xs"
                variant={isPinned ? "subtle" : "outline"}
                colorPalette={isPinned ? "primary" : undefined}
                onClick={handlePinToggle}
                h={6}
                rounded="sm"
                title={
                  isPinned
                    ? "Remove from inbox"
                    : "Pin this insight to your inbox"
                }
                _hover={{
                  bg: isPinned ? "primary.muted" : undefined,
                }}
              >
                <PushPinIcon size={14} weight={isPinned ? "fill" : "regular"} />
                {isPinned ? "Pinned" : "Pin to inbox"}
              </Button>
            )}
          </Flex>
        )}
        {showDisclaimer && <VisualizationDisclaimer />}
      </Flex>
      <InsightProvenanceDrawer
        isOpen={open}
        onClose={onClose}
        generation={widget.generation}
        title={widget.title}
      />
      {isChartType && (
        <Dialog.Root
          open={expanded}
          onOpenChange={(e) => !e.open && onCollapse()}
          size="cover"
        >
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content p={4}>
                <Dialog.Header px={0} pt={0} pb={3}>
                  <Flex align="center" gap={2}>
                    {WidgetIcons[widget.type]}
                    <Dialog.Title fontSize="md" fontWeight="medium">
                      {widget.title}
                    </Dialog.Title>
                  </Flex>
                  <Dialog.CloseTrigger
                    asChild
                    position="absolute"
                    top={3}
                    right={3}
                  >
                    <CloseButton size="sm" />
                  </Dialog.CloseTrigger>
                </Dialog.Header>
                <Dialog.Body px={0} pb={0}>
                  <WidgetErrorBoundary fallbackTitle="Unable to render chart">
                    <ChartWidget widget={widget} expanded />
                  </WidgetErrorBoundary>
                </Dialog.Body>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      )}
    </Box>
  );
}
