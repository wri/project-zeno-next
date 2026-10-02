import { describe, expect, it } from "vitest";
import { generateInsightTitle } from "../insight-title";

describe("generateInsightTitle", () => {
  it("joins dataset and location name for a country-level area", () => {
    expect(
      generateInsightTitle({
        datasetName: "Tree cover loss",
        locationName: "Para",
        areaLabel: "Para",
      })
    ).toBe("Tree cover loss in Para");
  });

  it("joins dataset and location name for a different dataset/area type", () => {
    expect(
      generateInsightTitle({
        datasetName: "Integrated alerts",
        locationName: "Central African Republic",
        areaLabel: "Central African Republic",
      })
    ).toBe("Integrated alerts in Central African Republic");
  });

  it("falls back to the area's own label when locationName is undefined", () => {
    expect(
      generateInsightTitle({
        datasetName: "Tree cover loss",
        locationName: undefined,
        areaLabel: "My uploaded area",
      })
    ).toBe("Tree cover loss in My uploaded area");
  });

  it("falls back to the area's own label when locationName is empty", () => {
    expect(
      generateInsightTitle({
        datasetName: "Tree cover loss",
        locationName: "",
        areaLabel: "My uploaded area",
      })
    ).toBe("Tree cover loss in My uploaded area");
  });
});
