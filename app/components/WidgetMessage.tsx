"use client";
import { useState } from "react";
import {
  Box,
  Heading,
  Flex,
  Button,
  Menu,
  Dialog,
  Portal,
  CloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import {
  MicroscopeIcon as Microscope,
  ArrowsOutIcon,
  ArrowSquareOutIcon,
  ChatIcon,
  SparkleIcon,
  DownloadSimpleIcon,
  TableIcon,
  ChartBarIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import { InsightWidget, DatasetInfo } from "@/app/types/chat";
import {
  exportToAI,
  AI_PROVIDERS,
  type AIProvider,
} from "@/app/utils/exportToAI";
import { toaster } from "@/app/components/ui/toaster";
import { AI_PROVIDER_ICONS } from "@/app/components/ui/AIProviderIcons";
import { Tooltip } from "@/app/components/ui/tooltip";
import TableWidget from "./widgets/TableWidget";
import DatasetCardWidget from "./widgets/DatasetCardWidget";
import ChartWidget from "./widgets/ChartWidget";
import { WidgetIcons } from "../utils/widgetIcons";
import InsightProvenanceDrawer from "./InsightProvenanceDrawer";
import VisualizationDisclaimer from "./VisualizationDisclaimer";
import WidgetErrorBoundary from "./widgets/WidgetErrorBoundary";
import ScrollableTableWrapper from "./widgets/ScrollableTableWrapper";

interface WidgetMessageProps {
  widget: InsightWidget;
  inWorkspace?: boolean;
}

export default function WidgetMessage({
  widget,
  inWorkspace,
}: WidgetMessageProps) {
  const [showAsTable, setShowAsTable] = useState(false);
  const { open, onOpen, onClose } = useDisclosure();
  const {
    open: expanded,
    onOpen: onExpand,
    onClose: onCollapse,
  } = useDisclosure();
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

  const handleExportToAI = (provider: AIProvider) => {
    const method = exportToAI(widget, provider);
    if (method === "clipboard") {
      toaster.create({
        title: "Prompt copied to clipboard",
        description: `Paste it into ${AI_PROVIDERS[provider].label} to continue your analysis.`,
        type: "info",
        duration: 5000,
      });
    }
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
      borderColor={inWorkspace ? "border.emphasized" : "blue.fg"}
      overflow="hidden"
      bg="neutral.100"
    >
      {!inWorkspace && (
        <Flex
          px={4}
          py={3}
          gap={2}
          bgGradient="LCLGradientLight"
          align="center"
        >
          {WidgetIcons[widget.type]}
          <Heading size="xs" fontWeight="medium" color="primary.fg" m={0}>
            {widget.title}
          </Heading>
        </Flex>
      )}
      <Flex gap={3} px={4} py={2} flexDir="column">
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
              color="neutral.500"
            >
              <ArrowsOutIcon size={14} />
              Full-screen
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
        {/* Bottom action row — provenance + download + continue in AI */}
        {(isChartType || widget.type === "table") && hasData && (
          <Flex
            justify="flex-start"
            gap={1}
            flexWrap={inWorkspace ? "nowrap" : "wrap"}
            align="center"
          >
            {widget.generation && (
              <Tooltip
                content="View how this was generated"
                variant="dark"
                showArrow
                positioning={{ placement: "top" }}
                openDelay={300}
              >
                <Button
                  size="xs"
                  variant="outline"
                  onClick={handleOpen}
                  bg={open ? "bg.info" : undefined}
                  borderColor={open ? "border.info" : undefined}
                  color="neutral.500"
                  h={6}
                  rounded="sm"
                  _hover={{ bg: open ? "blue.100" : undefined }}
                  aria-label="View how this was generated"
                >
                  <Microscope size={12} />
                  Show working
                </Button>
              </Tooltip>
            )}
            <Button
              size="xs"
              variant="outline"
              onClick={handleDownloadCsv}
              h={5}
              rounded="sm"
              color="neutral.500"
              px={2}
              aria-label="Download chart data"
            >
              <DownloadSimpleIcon size={12} />
              Download
            </Button>
            <Menu.Root positioning={{ strategy: "fixed" }}>
              <Menu.Trigger asChild>
                <Button
                  size="xs"
                  variant="outline"
                  h={5}
                  rounded="sm"
                  color="neutral.500"
                  px={2}
                  aria-label="Ask AI about this insight"
                >
                  <Box position="relative" display="inline-flex">
                    <ChatIcon size={12} />
                    <Box
                      position="absolute"
                      top="1px"
                      left="50%"
                      transform="translateX(-50%)"
                    >
                      <SparkleIcon size={6} weight="fill" />
                    </Box>
                  </Box>
                  Continue in...
                  <CaretDownIcon size={10} />
                </Button>
              </Menu.Trigger>
              <Menu.Positioner>
                <Menu.Content minW="140px">
                  {(Object.keys(AI_PROVIDERS) as AIProvider[]).map(
                    (provider) => {
                      const ProviderIcon = AI_PROVIDER_ICONS[provider];
                      return (
                        <Menu.Item
                          key={provider}
                          value={provider}
                          onSelect={() => handleExportToAI(provider)}
                          color="fg.muted"
                          aria-label={`Continue in ${AI_PROVIDERS[provider].label}`}
                        >
                          <Flex
                            w="full"
                            align="center"
                            justify="space-between"
                            gap={2}
                          >
                            <Flex align="center" gap={2}>
                              <Box as="span" color="neutral.600">
                                <ProviderIcon size={14} />
                              </Box>
                              {AI_PROVIDERS[provider].label}
                            </Flex>
                            <Box as="span" color="neutral.600">
                              <ArrowSquareOutIcon size={11} />
                            </Box>
                          </Flex>
                        </Menu.Item>
                      );
                    }
                  )}
                </Menu.Content>
              </Menu.Positioner>
            </Menu.Root>
          </Flex>
        )}
        {showDisclaimer && !inWorkspace && <VisualizationDisclaimer />}
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
