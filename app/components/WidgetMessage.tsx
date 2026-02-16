"use client";
import { useRef, useState } from "react";
import { Box, Text, Heading, Flex, Separator, Button, IconButton, Menu, Dialog, Portal, CloseButton, useDisclosure } from "@chakra-ui/react";
import { MicroscopeIcon as Microscope, ArrowsOutIcon, DownloadSimpleIcon, ImageIcon, TableIcon, ChartBarIcon, ExportIcon } from "@phosphor-icons/react";
import { Tooltip } from "./ui/tooltip";
import { InsightWidget, DatasetInfo } from "@/app/types/chat";
import TableWidget from "./widgets/TableWidget";
import DatasetCardWidget from "./widgets/DatasetCardWidget";
import ChartWidget from "./widgets/ChartWidget";
import { WidgetIcons } from "../ChatPanelHeader";
import InsightProvenanceDrawer from "./InsightProvenanceDrawer";
import VisualizationDisclaimer from "./VisualizationDisclaimer";
import WidgetErrorBoundary from "./widgets/WidgetErrorBoundary";
import exportChartPng from "@/app/utils/exportChartPng";

interface WidgetMessageProps {
  widget: InsightWidget;
}

export default function WidgetMessage({ widget }: WidgetMessageProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [showAsTable, setShowAsTable] = useState(false);
  const { open, onOpen, onClose } = useDisclosure();
  const { open: expanded, onOpen: onExpand, onClose: onCollapse } = useDisclosure();
  if (widget.type === "dataset-card") {
    return <DatasetCardWidget dataset={widget.data as DatasetInfo} />;
  }
  
  const handleOpen = () => {
    console.log("Opening drawer for widget:", widget.title, "Generation data:", widget.generation);
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
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
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
  const showDisclaimer = isChartType || widget.type === "table";
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
        <Text fontSize="xs" color="fg.muted">
          {widget.description}
        </Text>
        <Separator />
        <Flex justify="flex-end" gap={1} flexWrap="wrap" align="center">
          {/* Export menu — groups CSV + PNG downloads */}
          {(isChartType || widget.type === "table") && Array.isArray(widget.data) && widget.data.length > 0 && (
            <Menu.Root positioning={{ placement: "bottom-end" }}>
              <Menu.Trigger asChild>
                <IconButton
                  size="xs"
                  variant="outline"
                  h={6}
                  w={6}
                  minW={6}
                  rounded="sm"
                  aria-label="Export"
                >
                  <ExportIcon size={14} />
                </IconButton>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content minW="140px">
                    <Menu.Item value="csv" onClick={handleDownloadCsv}>
                      <DownloadSimpleIcon size={14} />
                      Download CSV
                    </Menu.Item>
                    {isChartType && (
                      <Menu.Item
                        value="png"
                        onClick={() => {
                          if (chartRef.current) {
                            const safeName = (widget.title || "chart").replace(/[^a-z0-9]/gi, "_");
                            exportChartPng(chartRef.current, `${safeName}.png`);
                          }
                        }}
                      >
                        <ImageIcon size={14} />
                        Save as PNG
                      </Menu.Item>
                    )}
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          )}
          {/* View toggle — icon-only */}
          {isChartType && Array.isArray(widget.data) && widget.data.length > 0 && (
            <Tooltip content={showAsTable ? "View chart" : "View as table"}>
              <IconButton
                size="xs"
                variant={showAsTable ? "solid" : "outline"}
                colorPalette={showAsTable ? "primary" : undefined}
                onClick={() => setShowAsTable((v) => !v)}
                h={6}
                w={6}
                minW={6}
                rounded="sm"
                aria-label={showAsTable ? "View chart" : "View as table"}
              >
                {showAsTable ? <ChartBarIcon size={14} /> : <TableIcon size={14} />}
              </IconButton>
            </Tooltip>
          )}
          {/* Expand — icon-only */}
          {isChartType && (
            <Tooltip content="Expand chart">
              <IconButton
                size="xs"
                variant="outline"
                onClick={onExpand}
                h={6}
                w={6}
                minW={6}
                rounded="sm"
                aria-label="Expand chart"
              >
                <ArrowsOutIcon size={14} />
              </IconButton>
            </Tooltip>
          )}
          {/* Provenance — keeps label since it's the key feature */}
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
        </Flex>
        {isChartType && !showAsTable && (
          <Box ref={chartRef}>
            <WidgetErrorBoundary fallbackTitle="Unable to render chart">
              <ChartWidget widget={widget} />
            </WidgetErrorBoundary>
          </Box>
        )}
        {isChartType && showAsTable && Array.isArray(widget.data) && (
          <WidgetErrorBoundary fallbackTitle="Unable to render table">
            <Box overflowX="auto" maxW="100%">
              <TableWidget
                data={widget.data as Record<string, string | number | boolean>[]}
                caption={widget.title}
              />
            </Box>
          </WidgetErrorBoundary>
        )}

        {widget.type === "table" && (
          <WidgetErrorBoundary fallbackTitle="Unable to render table">
            <Box overflowX="auto" maxW="100%">
              <TableWidget
                data={widget.data as Record<string, string | number | boolean>[]}
                caption={widget.title}
              />
            </Box>
          </WidgetErrorBoundary>
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
        <Dialog.Root open={expanded} onOpenChange={(e) => !e.open && onCollapse()} size="xl">
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
                  <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                    <CloseButton size="sm" />
                  </Dialog.CloseTrigger>
                </Dialog.Header>
                <Dialog.Body px={0} pb={0}>
                  {widget.description && (
                    <Text fontSize="xs" color="fg.muted" mb={3}>
                      {widget.description}
                    </Text>
                  )}
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
