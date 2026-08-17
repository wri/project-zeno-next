import {
  chartsToWidgets,
  firstChartTitle,
  resolveInsightTitle,
  type InsightRecord,
  type InsightVerification,
} from "@/src/entities/insight";
import type { InsightWidget } from "@/app/types/chat";

/**
 * One analysis as a single panel entry: the insight-level metadata plus every
 * chart it owns. The dashboard surface of the Analyses pane lists these (one
 * card per analysis, added/removed whole); the map surface still flattens to
 * one card per chart.
 */
export interface InsightGroupItem {
  /** Stable list key: the insight's backend id, else the lone chart's id/title. */
  id: string;
  title: string;
  source: string;
  createdAt: string;
  verification: InsightVerification;
  /**
   * The insight id the dashboards API can add — present only for real,
   * persisted AI insights; undefined for verified fixtures and unsaved
   * in-session analyses.
   */
  addableInsightId?: string;
  /** The insight's charts, each keeping its own chart title. */
  widgets: InsightWidget[];
}

/** One stored insight → one group with all of its charts. */
export function recordToGroup(record: InsightRecord): InsightGroupItem {
  const curated = record.verification === "verified";
  const widgets = chartsToWidgets(record.charts).map((widget) => ({
    ...widget,
    curated,
  }));
  return {
    id: record.id,
    title: resolveInsightTitle(record, firstChartTitle(record.charts)),
    source: record.source ?? "",
    createdAt: record.createdAt,
    verification: record.verification,
    addableInsightId:
      record.verification === "ai-generated" ? record.id : undefined,
    widgets,
  };
}

/**
 * Live in-session widgets → groups. Charts streamed for one analysis share an
 * `insightId` and fold into one group (addable whole once persisted); widgets
 * without one stay single-chart groups keyed by their own id.
 */
export function liveWidgetsToGroups(
  widgets: InsightWidget[]
): InsightGroupItem[] {
  const byKey = new Map<string, InsightGroupItem>();
  const out: InsightGroupItem[] = [];
  for (const widget of widgets) {
    const key = widget.insightId ?? widget.id ?? widget.title;
    const existing = byKey.get(key);
    if (existing) {
      existing.widgets.push(widget);
      continue;
    }
    const group: InsightGroupItem = {
      id: key,
      title: widget.title,
      source: widget.datasetName ?? "",
      createdAt: "",
      verification: "ai-generated",
      addableInsightId: widget.insightId,
      widgets: [widget],
    };
    byKey.set(key, group);
    out.push(group);
  }
  return out;
}

/** Concatenate lists, keeping the first occurrence of each group id. */
export function mergeGroupsById(
  ...lists: InsightGroupItem[][]
): InsightGroupItem[] {
  const seen = new Set<string>();
  const out: InsightGroupItem[] = [];
  for (const list of lists) {
    for (const group of list) {
      if (seen.has(group.id)) continue;
      seen.add(group.id);
      out.push(group);
    }
  }
  return out;
}
