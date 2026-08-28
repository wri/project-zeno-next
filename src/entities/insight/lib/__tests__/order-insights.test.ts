import { describe, expect, it } from "vitest";
import { orderInsightsForPager } from "../order-insights";
import type { InsightWidget } from "@/app/types/chat";

const w = (id: string): InsightWidget => ({
  id,
  type: "bar",
  title: id,
  description: "",
  xAxis: "year",
  yAxis: "",
  data: [],
});

describe("orderInsightsForPager", () => {
  it("puts the most recent analysis first", () => {
    const out = orderInsightsForPager([w("a-chart-0"), w("b-chart-0")]);
    expect(out.map((x) => x.id)).toEqual(["b-chart-0", "a-chart-0"]);
  });

  it("keeps the charts of one analysis in backend order", () => {
    // An LGMS analysis: the time-series lead chart must not end up last.
    const out = orderInsightsForPager([w("ins1-chart-0"), w("ins1-chart-3")]);
    expect(out.map((x) => x.id)).toEqual(["ins1-chart-0", "ins1-chart-3"]);
  });

  it("reverses across batches while preserving order within each", () => {
    const out = orderInsightsForPager([
      w("ins1-chart-0"),
      w("ins1-chart-1"),
      w("ins2-chart-0"),
      w("ins2-chart-1"),
    ]);
    expect(out.map((x) => x.id)).toEqual([
      "ins2-chart-0",
      "ins2-chart-1",
      "ins1-chart-0",
      "ins1-chart-1",
    ]);
  });

  it("treats widgets without the chart-id shape as their own batch", () => {
    // Unchanged newest-first behaviour for dataset cards and rehydrated history.
    const out = orderInsightsForPager([w("legacy-a"), w("legacy-b")]);
    expect(out.map((x) => x.id)).toEqual(["legacy-b", "legacy-a"]);
  });

  it("groups a batch even when its charts are not adjacent", () => {
    const out = orderInsightsForPager([
      w("ins1-chart-0"),
      w("other"),
      w("ins1-chart-1"),
    ]);
    expect(out.map((x) => x.id)).toEqual([
      "other",
      "ins1-chart-0",
      "ins1-chart-1",
    ]);
  });

  it("returns an empty list untouched", () => {
    expect(orderInsightsForPager([])).toEqual([]);
  });
});
