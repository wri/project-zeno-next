"use client";
import { useRef, useState } from "react";
import { Box, Text, Heading, Flex, Separator, Button, Menu, Dialog, Portal, CloseButton, useDisclosure } from "@chakra-ui/react";
import { MicroscopeIcon as Microscope, ArrowsOutIcon, DownloadSimpleIcon, ImageIcon, TableIcon, ChartBarIcon, CaretDownIcon } from "@phosphor-icons/react";

import { InsightWidget, DatasetInfo } from "@/app/types/chat";
import TableWidget from "./widgets/TableWidget";
import DatasetCardWidget from "./widgets/DatasetCardWidget";
import ChartWidget from "./widgets/ChartWidget";
import { WidgetIcons } from "../ChatPanelHeader";
import InsightProvenanceDrawer from "./InsightProvenanceDrawer";
import VisualizationDisclaimer from "./VisualizationDisclaimer";
import WidgetErrorBoundary from "./widgets/WidgetErrorBoundary";
import ScrollableTableWrapper from "./widgets/ScrollableTableWrapper";
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
  const hasData = Array.isArray(widget.data) && widget.data.length > 0;
  const showDisclaimer = (isChartType || widget.type === "table") && hasData;
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
        {hasData && (
          <>
            <Text fontSize="xs" color="fg.muted">
              {widget.description}
            </Text>
            <Separator />
          </>
        )}
        {/* Toolbar row — segmented toggle + full-screen */}
        <Flex justify="flex-start" gap={2} flexWrap="wrap" align="center">
          {/* Segmented Chart / Table toggle */}
          {isChartType && hasData && (
            <Flex gap={0} border="1px solid" borderColor="border.emphasized" rounded="md" overflow="hidden">
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
          <Box ref={chartRef}>
            <WidgetErrorBoundary fallbackTitle="Unable to render chart">
              <ChartWidget widget={widget} />
            </WidgetErrorBoundary>
          </Box>
        )}
        {isChartType && showAsTable && Array.isArray(widget.data) && (
          <WidgetErrorBoundary fallbackTitle="Unable to render table">
            <ScrollableTableWrapper>
              <TableWidget
                data={widget.data as Record<string, string | number | boolean>[]}
                caption={widget.title}
              />
            </ScrollableTableWrapper>
          </WidgetErrorBoundary>
        )}

        {widget.type === "table" && (
          <WidgetErrorBoundary fallbackTitle="Unable to render table">
            <ScrollableTableWrapper>
              <TableWidget
                data={widget.data as Record<string, string | number | boolean>[]}
                caption={widget.title}
              />
            </ScrollableTableWrapper>
          </WidgetErrorBoundary>
        )}
        {/* Bottom action row — provenance + download */}
        {((isChartType || widget.type === "table") && hasData) && (
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
            <Menu.Root positioning={{ placement: "bottom-start" }}>
              <Menu.Trigger asChild>
                <Button
                  size="xs"
                  variant="outline"
                  h={6}
                  rounded="sm"
                >
                  <DownloadSimpleIcon size={14} />
                  Download
                  <CaretDownIcon size={12} />
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content minW="140px">
                    <Menu.Item value="csv" onClick={handleDownloadCsv}>
                      <DownloadSimpleIcon size={14} />
                      Data as CSV
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
                        Chart as PNG
                      </Menu.Item>
                    )}
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
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
        <Dialog.Root open={expanded} onOpenChange={(e) => !e.open && onCollapse()} size="cover">
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
