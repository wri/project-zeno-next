"use client";

import { Wrap, Badge } from "@chakra-ui/react";
import type { PinnedInsight, ChartType } from "@/app/types/portfolio";

type Props = {
  insight: PinnedInsight;
  // Smaller chips for the inbox card and block subtitle row.
  size?: "xs" | "sm";
};

function chartTypeLabel(type: ChartType): string {
  switch (type) {
    case "bar":
      return "Bar chart";
    case "line":
      return "Line chart";
    case "area":
      return "Area chart";
    case "pie":
      return "Pie chart";
    case "scatter":
      return "Scatter";
    default:
      return "Chart";
  }
}

// Compact strip of metadata chips derived from a PinnedInsight.
// Surfaces the same handful of fields on both the inbox card and the
// canvas insight block so users can scan datasets, AOIs, and chart
// types at a glance.
export default function MetadataChips({ insight, size = "xs" }: Props) {
  return (
    <Wrap gap={1.5} mt={1}>
      {insight.datasetName && (
        <Badge size={size} colorPalette="blue" variant="subtle">
          {insight.datasetName}
        </Badge>
      )}
      <Badge size={size} colorPalette="green" variant="subtle">
        {insight.aoi.isMultiArea
          ? `${insight.aoi.src_ids.length} areas`
          : insight.aoi.name}
      </Badge>
      {insight.aoi.source && insight.aoi.source !== "unknown" && (
        <Badge size={size} colorPalette="gray" variant="outline">
          {insight.aoi.source}
        </Badge>
      )}
      <Badge size={size} colorPalette="gray" variant="outline">
        {chartTypeLabel(insight.chartType)}
      </Badge>
      {insight.aoi.isMultiArea && (
        <Badge size={size} colorPalette="orange" variant="subtle">
          Multi-area
        </Badge>
      )}
    </Wrap>
  );
}
