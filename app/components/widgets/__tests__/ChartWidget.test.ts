import { describe, expect, it } from "vitest";
import { computeYAxisWidth } from "../ChartWidget";

describe("computeYAxisWidth", () => {
  it("reserves a title band when a y-axis title will render", () => {
    const withTitle = computeYAxisWidth(4, true);
    const withoutTitle = computeYAxisWidth(4, false);
    // 22px title band, per ChartWidget's TITLE_BAND constant.
    expect(withTitle - withoutTitle).toBe(22);
  });

  it("still fits the widest tick text with no title (e.g. LGMS's empty yAxis)", () => {
    // "1500"/"-1000" etc. — 4-5 chars at the 11px axis font.
    const width = computeYAxisWidth(5, false);
    expect(width).toBeGreaterThanOrEqual(5 * 6.5 + 6);
  });

  it("grows with the longest tick's character count", () => {
    expect(computeYAxisWidth(6, false)).toBeGreaterThan(
      computeYAxisWidth(3, false)
    );
  });
});
