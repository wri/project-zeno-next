import { describe, expect, it } from "vitest";
import { firstChartTitle, resolveInsightTitle } from "../resolve-insight-title";

describe("resolveInsightTitle", () => {
  it("uses the record's generated title when present", () => {
    expect(
      resolveInsightTitle({ title: "Tree cover loss in Brazil" }, "Annual loss")
    ).toBe("Tree cover loss in Brazil");
  });

  it("falls back to the chart title when the record has none", () => {
    expect(resolveInsightTitle({ title: undefined }, "Annual loss")).toBe(
      "Annual loss"
    );
  });
});

describe("firstChartTitle", () => {
  it("picks by position, not by array order", () => {
    expect(
      firstChartTitle([
        { position: 2, title: "By driver" },
        { position: 0, title: "Annual loss" },
        { position: 1, title: "By month" },
      ])
    ).toBe("Annual loss");
  });

  it("trims the title it returns", () => {
    expect(firstChartTitle([{ position: 0, title: "  Annual loss  " }])).toBe(
      "Annual loss"
    );
  });

  it("returns an empty string for an empty roster, so callers can default", () => {
    expect(firstChartTitle([])).toBe("");
  });
});
