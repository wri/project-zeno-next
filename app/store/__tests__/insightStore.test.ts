import { describe, it, expect, beforeEach } from "vitest";
import useInsightStore from "../insightStore";
import { InsightWidget } from "@/app/types/chat";

const widget = (title: string): InsightWidget => ({
  type: "bar",
  title,
  description: "",
  data: [],
  xAxis: "year",
  yAxis: "area",
});

describe("insightStore", () => {
  beforeEach(() => {
    useInsightStore.getState().clearInsights();
  });

  it("addInsights accumulates across calls and preserves order", () => {
    useInsightStore.getState().addInsights([widget("A")]);
    useInsightStore.getState().addInsights([widget("B")]);
    const { insights } = useInsightStore.getState();
    expect(insights).toHaveLength(2);
    expect(insights[0].title).toBe("A");
    expect(insights[1].title).toBe("B");
  });

  it("addInsights appends all widgets from a single call atomically", () => {
    useInsightStore
      .getState()
      .addInsights([widget("A"), widget("B"), widget("C")]);
    expect(useInsightStore.getState().insights).toHaveLength(3);
  });

  it("clearInsights resets to empty", () => {
    useInsightStore.getState().addInsights([widget("A")]);
    useInsightStore.getState().clearInsights();
    expect(useInsightStore.getState().insights).toEqual([]);
  });

  it("replaces widgets sharing an insightId instead of duplicating them", () => {
    useInsightStore
      .getState()
      .addInsights([{ ...widget("Tree cover"), insightId: "abc" }]);
    useInsightStore
      .getState()
      .addInsights([{ ...widget("Tree cover (restyled)"), insightId: "abc" }]);
    const { insights } = useInsightStore.getState();
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("Tree cover (restyled)");
  });

  it("moves an updated insight to the end (newest) while keeping others", () => {
    useInsightStore
      .getState()
      .addInsights([{ ...widget("A"), insightId: "a" }]);
    useInsightStore
      .getState()
      .addInsights([{ ...widget("B"), insightId: "b" }]);
    useInsightStore
      .getState()
      .addInsights([{ ...widget("A (updated)"), insightId: "a" }]);
    const { insights } = useInsightStore.getState();
    expect(insights.map((w) => w.title)).toEqual(["B", "A (updated)"]);
  });

  it("does not dedupe widgets without an insightId", () => {
    useInsightStore.getState().addInsights([widget("A")]);
    useInsightStore.getState().addInsights([widget("A")]);
    expect(useInsightStore.getState().insights).toHaveLength(2);
  });
});
