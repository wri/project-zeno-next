"use client";
import { useRef, useState } from "react";
import {
  Box,
  Heading,
  Flex,
  Button,
  Menu,
  Dialog,
  Portal,
  CloseButton,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import {
  MicroscopeIcon as Microscope,
  ArrowsOutIcon,
  ArrowSquareOutIcon,
  SparkleIcon,
  DownloadSimpleIcon,
  FileCsvIcon,
  ImageIcon,
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
import ChartWidget, { AXIS_FIT_TYPES } from "./widgets/ChartWidget";
import { WidgetIcons } from "../utils/widgetIcons";
import InsightProvenanceDrawer from "./InsightProvenanceDrawer";
import VisualizationDisclaimer from "./VisualizationDisclaimer";
import WidgetErrorBoundary from "./widgets/WidgetErrorBoundary";
import ScrollableTableWrapper from "./widgets/ScrollableTableWrapper";
import { AnalysisParamsChips } from "./widgets/AnalysisParameters";
import { buildChips } from "./widgets/analysis-params-utils";
import { exportChartImage } from "@/app/utils/exportChartImage";

interface WidgetMessageProps {
  widget: InsightWidget;
  inWorkspace?: boolean;
}

/** Y-axis with the classic break squiggle — icon for the fit-axis toggle. */
function AxisBreakIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M7 1.5v3.5" />
      <path d="M4.5 7.5l5-2" />
      <path d="M4.5 10l5-2" />
      <path d="M7 11v1.5" />
    </svg>
  );
}

export default function WidgetMessage({
  widget,
  inWorkspace,
}: WidgetMessageProps) {
  const [showAsTable, setShowAsTable] = useState(false);
  const [fitYAxis, setFitYAxis] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
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

  const handleDownloadImage = async () => {
    if (!chartRef.current || exportingImage) return;
    setExportingImage(true);
    try {
      await exportChartImage(chartRef.current, widget.title);
    } catch (error) {
      console.error("Chart image export failed:", error);
      toaster.create({
        title: "Image export failed",
        description:
          "The chart couldn't be saved as an image. You can still download the data as CSV.",
        type: "error",
        duration: 4000,
      });
    } finally {
      setExportingImage(false);
    }
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
  const supportsAxisFit = AXIS_FIT_TYPES.has(widget.type);
  const fullscreenChips = widget.analysisParams
    ? buildChips(widget.analysisParams)
    : [];
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
              role="group"
              aria-label="Visualization format"
            >
              <Button
                size="xs"
                variant={!showAsTable ? "solid" : "ghost"}
                colorPalette={!showAsTable ? "primary" : undefined}
                onClick={() => setShowAsTable(false)}
                h={6}
                rounded="none"
                fontWeight="medium"
                aria-pressed={!showAsTable}
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
                aria-pressed={showAsTable}
              >
                <TableIcon size={14} />
                Table
              </Button>
            </Flex>
          )}
          {/* Fit y-axis to data — only for types where a non-zero baseline
              is honest (line/area/scatter; bar lengths encode magnitude) */}
          {isChartType && hasData && supportsAxisFit && !showAsTable && (
            <Button
              size="xs"
              variant={fitYAxis ? "solid" : "outline"}
              colorPalette={fitYAxis ? "primary" : undefined}
              onClick={() => setFitYAxis((v) => !v)}
              h={6}
              rounded="sm"
              color={fitYAxis ? undefined : "neutral.500"}
              aria-pressed={fitYAxis}
              title="Rescale the y-axis to the data range instead of starting at zero"
            >
              <AxisBreakIcon />
              Fit y-axis
            </Button>
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
            <Box ref={chartRef}>
              <ChartWidget widget={widget} fitYAxis={fitYAxis} />
            </Box>
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
            <Menu.Root positioning={{ placement: "bottom-start" }}>
              <Menu.Trigger asChild>
                <Button
                  size="xs"
                  variant="outline"
                  h={6}
                  rounded="sm"
                  color="neutral.500"
                  loading={exportingImage}
                >
                  <DownloadSimpleIcon size={14} />
                  Download
                  <CaretDownIcon size={12} />
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content minW="180px" zIndex={1400}>
                    <Menu.Item value="csv" onClick={handleDownloadCsv}>
                      <FileCsvIcon size={14} />
                      Data (CSV)
                    </Menu.Item>
                    {isChartType && !showAsTable && (
                      <Menu.Item value="png" onClick={handleDownloadImage}>
                        <ImageIcon size={14} />
                        Chart image (PNG)
                      </Menu.Item>
                    )}
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
            <Menu.Root positioning={{ strategy: "fixed" }}>
              <Menu.Trigger asChild>
                <Button
                  size="xs"
                  variant="outline"
                  h={6}
                  rounded="sm"
                  color="neutral.500"
                  px={2}
                  aria-label="Ask AI about this insight"
                >
                  <SparkleIcon size={10} />
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
                <Dialog.Body
                  px={0}
                  pb={0}
                  display="flex"
                  flexDirection={{ base: "column", md: "row" }}
                  gap={6}
                  minH={0}
                  overflow="auto"
                >
                  <Box flex="1" minW={0}>
                    <WidgetErrorBoundary fallbackTitle="Unable to render chart">
                      <ChartWidget
                        widget={widget}
                        expanded
                        fitYAxis={fitYAxis}
                      />
                    </WidgetErrorBoundary>
                  </Box>
                  {(widget.description ||
                    fullscreenChips.length > 0 ||
                    widget.datasetName) && (
                    <Flex
                      direction="column"
                      gap={4}
                      w={{ base: "100%", md: "300px" }}
                      flexShrink={0}
                      borderLeftWidth={{ base: 0, md: "1px" }}
                      borderTopWidth={{ base: "1px", md: 0 }}
                      borderColor="border"
                      pl={{ base: 0, md: 5 }}
                      pt={{ base: 4, md: 1 }}
                      overflowY="auto"
                    >
                      {widget.description && (
                        <Box>
                          <Heading size="xs" mb={1}>
                            About this insight
                          </Heading>
                          <Text fontSize="sm" color="fg.muted">
                            {widget.description}
                          </Text>
                        </Box>
                      )}
                      {fullscreenChips.length > 0 && (
                        <Box>
                          <Heading size="xs" mb={2}>
                            Analysis parameters
                          </Heading>
                          <AnalysisParamsChips chips={fullscreenChips} />
                        </Box>
                      )}
                      {widget.datasetName && (
                        <Box>
                          <Heading size="xs" mb={1}>
                            Dataset
                          </Heading>
                          <Text fontSize="sm" color="fg.muted">
                            {widget.datasetName}
                          </Text>
                        </Box>
                      )}
                      <Box mt="auto">
                        <VisualizationDisclaimer />
                      </Box>
                    </Flex>
                  )}
                </Dialog.Body>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      )}
    </Box>
  );
}
