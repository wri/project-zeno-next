import { describe, it, expect, beforeEach } from "vitest";
import useInsightStore from "../insightStore";
import { InsightWidget } from "@/app/types/chat";

const widget = (title: string, id?: string): InsightWidget => ({
  ...(id ? { id } : {}),
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

  it("addInsight appends one and dedupes by id", () => {
    useInsightStore.getState().addInsight(widget("A", "a"));
    useInsightStore.getState().addInsight(widget("A again", "a"));
    const { insights } = useInsightStore.getState();
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("A");
  });

  it("removeInsight hides by id", () => {
    useInsightStore.getState().addInsight(widget("A", "a"));
    useInsightStore.getState().addInsight(widget("B", "b"));
    useInsightStore.getState().removeInsight("a");
    const { insights } = useInsightStore.getState();
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe("b");
  });
});
