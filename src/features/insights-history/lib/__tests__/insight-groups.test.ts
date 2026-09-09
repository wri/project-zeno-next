import { describe, expect, it } from "vitest";

import {
  analysisResultToGroup,
  liveWidgetsToGroups,
  mergeGroupsById,
  partitionByVerification,
  recordToGroup,
} from "../insight-groups";
import type { InsightRecord } from "@/src/entities/insight";
import type { AnalysisResult } from "@/src/features/analysis";
import type { InsightWidget } from "@/app/types/chat";

function chart(overrides: Record<string, unknown> = {}) {
  return {
    id: "c-1",
    position: 0,
    title: "Alerts trend",
    type: "line",
    xAxis: "year",
    yAxis: "area",
    colorField: "",
    stackField: "",
    groupField: "",
    seriesFields: [],
    data: [],
    ...overrides,
  };
}

function record(overrides: Partial<InsightRecord> = {}): InsightRecord {
  return {
    id: "ins-1",
    createdAt: "2026-07-01T00:00:00Z",
    insightText: "Alerts spiked.",
    verification: "ai-generated",
    charts: [chart(), chart({ id: "c-2", position: 1, title: "By driver" })],
    ...overrides,
  };
}

function liveWidget(overrides: Partial<InsightWidget> = {}): InsightWidget {
  return {
    id: "w-1",
    type: "line",
    title: "Live chart",
    description: "",
    data: [],
    xAxis: "x",
    yAxis: "y",
    ...overrides,
  };
}

describe("recordToGroup", () => {
  it("keeps one group per insight with all its charts", () => {
    const group = recordToGroup(record());
    expect(group.id).toBe("ins-1");
    expect(group.title).toBe("Alerts trend");
    expect(group.widgets.map((w) => w.id)).toEqual(["c-1", "c-2"]);
    // Charts keep their own titles inside the group.
    expect(group.widgets[1].title).toBe("By driver");
    expect(group.addableInsightId).toBe("ins-1");
    expect(group.verification).toBe("ai-generated");
  });

  it("prefers the record title and keeps curated groups addable by their id", () => {
    const group = recordToGroup(
      record({
        verification: "verified",
        title: "Tree cover loss in Brazil",
        source: "Global Forest Watch",
      })
    );
    expect(group.title).toBe("Tree cover loss in Brazil");
    // A persisted curated insight is a real row the dashboards API can add.
    expect(group.addableInsightId).toBe("ins-1");
    expect(group.widgets.every((w) => w.curated)).toBe(true);
    expect(group.source).toBe("Global Forest Watch");
  });
});

describe("analysisResultToGroup", () => {
  const result: AnalysisResult = {
    id: "ins-7",
    charts: [
      chart({ id: "c-7a", title: "Annual tree cover loss" }),
      chart({ id: "c-7b", position: 1, title: "Annual GHG emissions" }),
    ],
    params: { source: "gadm", srcId: "BRA.14", name: "Pará" },
  };
  const ctx = { datasetName: "Tree cover loss", areaName: "Pará" };

  it("builds a verified, addable group titled after the dataset and area", () => {
    const group = analysisResultToGroup(result, ctx);
    expect(group.id).toBe("ins-7");
    expect(group.title).toBe("Tree cover loss in Pará");
    expect(group.source).toBe("Tree cover loss");
    expect(group.verification).toBe("verified");
    expect(group.addableInsightId).toBe("ins-7");
  });

  it("stamps every widget with the insight id, curated flag and dataset", () => {
    const group = analysisResultToGroup(result, ctx);
    expect(group.widgets).toHaveLength(2);
    for (const widget of group.widgets) {
      expect(widget.insightId).toBe("ins-7");
      expect(widget.curated).toBe(true);
      expect(widget.datasetName).toBe("Tree cover loss");
      expect(widget.analysisParams).toEqual({
        areas: ["Pará"],
        dataset: "Tree cover loss",
      });
    }
  });

  it("keeps each chart's own title inside the group", () => {
    const group = analysisResultToGroup(result, ctx);
    expect(group.widgets.map((w) => w.title)).toEqual([
      "Annual tree cover loss",
      "Annual GHG emissions",
    ]);
  });

  it("maps a completed job with no charts to an empty group", () => {
    const group = analysisResultToGroup({ id: "ins-8", charts: [] }, ctx);
    expect(group.widgets).toEqual([]);
    expect(group.addableInsightId).toBe("ins-8");
  });
});

describe("partitionByVerification", () => {
  it("splits records by verification, preserving order within each side", () => {
    const records = [
      record({ id: "a", verification: "verified" }),
      record({ id: "b" }),
      record({ id: "c", verification: "verified" }),
      record({ id: "d" }),
    ];
    const { curated, aiGenerated } = partitionByVerification(records);
    expect(curated.map((r) => r.id)).toEqual(["a", "c"]);
    expect(aiGenerated.map((r) => r.id)).toEqual(["b", "d"]);
  });

  it("returns two empty lists for no records", () => {
    expect(partitionByVerification([])).toEqual({
      curated: [],
      aiGenerated: [],
    });
  });
});

describe("liveWidgetsToGroups", () => {
  it("groups live widgets that share an insight id", () => {
    const groups = liveWidgetsToGroups([
      liveWidget({ id: "w-1", insightId: "ins-9" }),
      liveWidget({ id: "w-2", title: "Second", insightId: "ins-9" }),
      liveWidget({ id: "w-3", title: "Standalone" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].id).toBe("ins-9");
    expect(groups[0].widgets.map((w) => w.id)).toEqual(["w-1", "w-2"]);
    expect(groups[0].addableInsightId).toBe("ins-9");
    expect(groups[1].id).toBe("w-3");
    expect(groups[1].addableInsightId).toBeUndefined();
  });
});

describe("mergeGroupsById", () => {
  it("keeps the first occurrence of each group id", () => {
    const fromRecords = [recordToGroup(record())];
    const fromLive = liveWidgetsToGroups([
      liveWidget({ id: "c-9", insightId: "ins-1" }), // same insight, replayed
      liveWidget({ id: "w-5", title: "Fresh", insightId: "ins-2" }),
    ]);
    const merged = mergeGroupsById(fromRecords, fromLive);
    expect(merged.map((g) => g.id)).toEqual(["ins-1", "ins-2"]);
    // The record's version of ins-1 wins over the live one.
    expect(merged[0].widgets.map((w) => w.id)).toEqual(["c-1", "c-2"]);
  });
});
