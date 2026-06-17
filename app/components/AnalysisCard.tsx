"use client";
import { Box, Flex, Text } from "@chakra-ui/react";
import { SparkleIcon } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { InsightWidget } from "@/app/types/chat";
import { WidgetIconComponent } from "@/app/utils/widgetIcons";
import { InfoCard } from "./InfoCard";

const TYPE_LABEL_COLOR = "#8E9954";

function formatRelativeTime(timestamp: string): string | null {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true });
}

const CHART_TYPE_LABEL: Record<InsightWidget["type"], string> = {
  line: "Line chart",
  bar: "Bar chart",
  "stacked-bar": "Stacked bar chart",
  "grouped-bar": "Grouped bar chart",
  pie: "Pie chart",
  area: "Area chart",
  scatter: "Scatter chart",
  table: "Table",
  "dataset-card": "Dataset",
};

const ROW_NOUN: Record<InsightWidget["type"], string> = {
  table: "rows",
  "dataset-card": "items",
  line: "data points",
  bar: "data points",
  "stacked-bar": "data points",
  "grouped-bar": "data points",
  pie: "data points",
  area: "data points",
  scatter: "data points",
};

function buildSubtitle(widget: InsightWidget): string {
  const chartLabel = CHART_TYPE_LABEL[widget.type] ?? widget.type;
  if (!Array.isArray(widget.data)) return chartLabel;
  const count = widget.data.length;
  const noun = ROW_NOUN[widget.type] ?? "data points";
  const label = count === 1 ? noun.replace(/s$/, "") : noun;
  return `${chartLabel} · ${count} ${label}`;
}

interface AnalysisCardProps {
  widget: InsightWidget;
  onClick?: () => void;
  selected?: boolean;
  /** Message timestamp, surfaced as a relative time (e.g. "1 day ago"). */
  timestamp?: string;
}

export function AnalysisCard({
  widget,
  onClick,
  selected,
  timestamp,
}: AnalysisCardProps) {
  const Icon = WidgetIconComponent[widget.type];
  const relativeTime = timestamp ? formatRelativeTime(timestamp) : null;

  return (
    <Box w="100%">
      <InfoCard
        thumbnail={<Icon size={32} color="#0049AA" />}
        thumbnailBg="#F7F9FF"
        typeLabel="AI-INSIGHT ANALYSIS"
        typeLabelColor={TYPE_LABEL_COLOR}
        typeLabelIcon={
          <SparkleIcon size={12} weight="thin" color={TYPE_LABEL_COLOR} />
        }
        title={widget.title}
        description={buildSubtitle(widget)}
        onClick={onClick}
        selected={selected}
        titleActions={
          relativeTime ? (
            <Text
              flexShrink={0}
              fontFamily="mono"
              fontSize="10px"
              lineHeight="16px"
              color="#656E7B"
              whiteSpace="nowrap"
            >
              {relativeTime}
            </Text>
          ) : undefined
        }
      />
      {widget.datasetName && (
        <Flex
          align="center"
          px="12px"
          py="6px"
          bg="green.50"
          borderX="1px solid"
          borderBottom="1px solid"
          borderColor="rgba(19, 22, 25, 0.3)"
          borderBottomRadius="4px"
          mt="-1px"
        >
          <Text
            fontFamily="mono"
            fontSize="10px"
            lineHeight="16px"
            color="green.700"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            Source: {widget.datasetName}
          </Text>
        </Flex>
      )}
    </Box>
  );
}
