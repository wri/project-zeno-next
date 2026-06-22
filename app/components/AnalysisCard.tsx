"use client";
import { Flex, Text } from "@chakra-ui/react";
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
    <Flex direction="column" gap="4px" w="100%">
      <InfoCard
        thumbnail={<Icon size={32} color="#0049AA" />}
        thumbnailBg="#F7F9FF"
        typeLabel="AI-INSIGHT ANALYSIS"
        typeLabelColor={TYPE_LABEL_COLOR}
        typeLabelIcon={
          <SparkleIcon size={12} weight="thin" color={TYPE_LABEL_COLOR} />
        }
        title={widget.title}
        description={relativeTime ?? undefined}
        onClick={onClick}
        selected={selected}
      />
      {widget.datasetName && (
        <Flex align="center" px="12px" py="8px" bg="lime.100" rounded="8px">
          <Text
            fontFamily="body"
            fontSize="10px"
            lineHeight="150%"
            color="#23271A"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            Source: {widget.datasetName}
          </Text>
        </Flex>
      )}
    </Flex>
  );
}
