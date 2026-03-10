import { v4 as uuidv4 } from "uuid";
import type { ReportBlock, PinnedWidget } from "@/app/types/report";
import type { ChartSelection } from "../types/stream";
import { DATASETS, DATASET_META } from "../constants/datasets";

/**
 * Extract an area label from a chart label like "Tree cover loss — Amapá".
 * Returns the portion after the last " — " separator, or the full label.
 */
function extractAreaLabel(chartLabel: string): string {
  const parts = chartLabel.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : chartLabel;
}

/**
 * Extract the dataset/metric portion from a chart label (before " — ").
 */
function extractBaseLabel(chartLabel: string): string {
  const idx = chartLabel.indexOf(" — ");
  return idx >= 0 ? chartLabel.slice(0, idx) : chartLabel;
}

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
    areaLabel: extractAreaLabel(selection.config.label),
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
 * Per-area selections sharing the same `perAreaGroup` are merged into a
 * single insight block with an area selector (via `widget.variants`).
 * Other selections become individual insight blocks.
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

  // Separate per-area grouped selections from standalone ones
  const grouped = new Map<string, ChartSelection[]>();
  const standalone: ChartSelection[] = [];

  for (const selection of selections) {
    if (selection.perAreaGroup) {
      const list = grouped.get(selection.perAreaGroup) ?? [];
      list.push(selection);
      grouped.set(selection.perAreaGroup, list);
    } else {
      standalone.push(selection);
    }
  }

  // Grouped per-area selections → single block with area selector
  for (const [, group] of grouped) {
    if (group.length === 0) continue;

    const variants = group.map((sel) =>
      selectionToWidget(sel, areaNames, dateRange),
    );

    // Primary widget = first variant; title = base dataset label
    const primary = variants[0];
    const baseLabel = extractBaseLabel(group[0].config.label);
    const widget: PinnedWidget = {
      ...primary,
      title: `${baseLabel} — Per Area`,
      variants,
    };

    blocks.push({
      id: uuidv4(),
      kind: "insight",
      widget,
      size: "half",
      order: order++,
      createdAt: now,
    });
  }

  // Standalone selections → one block each
  for (const selection of standalone) {
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
