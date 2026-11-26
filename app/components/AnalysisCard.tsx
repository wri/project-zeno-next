import { Flex, Text } from "@chakra-ui/react";
import { formatDistanceToNow } from "date-fns";
import { InsightWidget } from "@/app/types/chat";
import { WidgetIconComponent } from "@/app/utils/widgetIcons";
import { isCuratedWidget } from "@/src/entities/insight";
import { VERIFICATION_EYEBROW } from "@/src/shared/ui/entity-card";
import { InfoCard } from "./InfoCard";

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
  const eyebrow =
    VERIFICATION_EYEBROW[isCuratedWidget(widget) ? "verified" : "ai-generated"];
  const EyebrowIcon = eyebrow.Icon;
  const relativeTime = timestamp ? formatRelativeTime(timestamp) : null;

  return (
    <Flex direction="column" gap="4px" w="100%">
      <InfoCard
        thumbnail={<Icon size={32} color="#0049AA" />}
        thumbnailBg="#F7F9FF"
        typeLabel={eyebrow.label}
        typeLabelColor={eyebrow.color}
        typeLabelIcon={
          EyebrowIcon && (
            <EyebrowIcon
              size={12}
              weight={eyebrow.iconWeight}
              color={eyebrow.iconColor}
            />
          )
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
