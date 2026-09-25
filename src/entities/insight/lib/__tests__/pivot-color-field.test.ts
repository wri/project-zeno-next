import { describe, expect, it } from "vitest";
import { pivotByColorField } from "../pivot-color-field";

// The integrated alerts generator's shape (project-zeno#840).
const alerts = [
  { alert_date: "2026-09-11", alert_confidence: "high", area_ha: 10 },
  { alert_date: "2026-09-11", alert_confidence: "low", area_ha: 2 },
  { alert_date: "2026-09-12", alert_confidence: "high", area_ha: 7 },
  { alert_date: "2026-09-14", alert_confidence: "low", area_ha: 1 },
];

const chart = (overrides = {}) => ({
  type: "line",
  data: alerts,
  xAxis: "alert_date",
  yAxis: "area_ha",
  colorField: "alert_confidence",
  ...overrides,
});

describe("pivotByColorField", () => {
  it("pivots long rows to one row per x value, one column per category", () => {
    expect(pivotByColorField(chart())).toEqual({
      data: [
        { alert_date: "2026-09-11", high: 10, low: 2 },
        { alert_date: "2026-09-12", high: 7 },
        { alert_date: "2026-09-14", low: 1 },
      ],
      seriesFields: ["high", "low"],
    });
  });

  it("leaves a category absent where the backend omitted it, never zero", () => {
    const pivoted = pivotByColorField(chart());
    expect(pivoted?.data[1]).not.toHaveProperty("low");
  });

  it.each([
    ["no color field", { colorField: "" }],
    ["a bar chart", { type: "bar" }],
    ["color field equal to the x axis", { colorField: "alert_date" }],
    [
      "rows missing the color field",
      { data: [{ alert_date: "x", area_ha: 1 }] },
    ],
    ["no rows", { data: [] }],
  ])("returns null for %s", (_, overrides) => {
    expect(pivotByColorField(chart(overrides))).toBeNull();
  });
});
