import { describe, expect, it } from "vitest";
import { resolveInsightTitle } from "../resolve-insight-title";

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
