import { v4 as uuidv4 } from "uuid";
import type { ReportBlock, PinnedWidget } from "@/app/types/report";
import type { ChartSelection } from "../types/stream";
import { DATASETS, DATASET_META } from "../constants/datasets";

/**
 * Build a PinnedWidget from a ChartSelection, including dataset metadata.
 */
export function selectionToWidget(
  selection: ChartSelection,
  areaNames?: string[],
  dateRange?: { start: string; end: string },
): PinnedWidget {
  const meta = DATASET_META[selection.datasetId];
  return {
    type: selection.config.type,
    title: selection.config.label,
    description: "",
    data: selection.config.pivotedData ?? selection.rows,
    xAxis: selection.config.xAxis,
    yAxis: selection.config.yAxis,
    sourceThreadId: "",
    metadata: {
      datasetName:
        DATASETS[selection.datasetId] ?? `Dataset ${selection.datasetId}`,
      aoiNames: areaNames,
      dateRange:
        dateRange ??
        (meta
          ? {
              start: meta.startDate,
              end: meta.endDate ?? new Date().toISOString().slice(0, 10),
            }
          : undefined),
    },
  };
}

/**
 * Converts wizard chart selections into ReportBlock[] for the dashboard.
 *
 * Each ChartSelection becomes an insight block with a PinnedWidget.
 * Optional summary insights become text blocks at the top.
 */
export function convertSelectionsToBlocks(
  selections: ChartSelection[],
  summaryInsights?: string[],
  areaNames?: string[],
  dateRange?: { start: string; end: string },
): ReportBlock[] {
  const blocks: ReportBlock[] = [];
  let order = 0;
  const now = new Date().toISOString();

  // Summary insights become text blocks at the top
  if (summaryInsights && summaryInsights.length > 0) {
    const summaryText = summaryInsights.join("\n\n");
    blocks.push({
      id: uuidv4(),
      kind: "text",
      content: summaryText,
      size: "full",
      order: order++,
      createdAt: now,
      generatedByAi: true,
    });
  }

  // Each chart selection becomes an insight block
  for (const selection of selections) {
    const widget = selectionToWidget(selection, areaNames, dateRange);

    blocks.push({
      id: uuidv4(),
      kind: "insight",
      widget,
      size: "half",
      order: order++,
      createdAt: now,
    });
  }

  return blocks;
}
