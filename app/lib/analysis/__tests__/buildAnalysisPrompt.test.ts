import { describe, it, expect } from "vitest";
import { buildAnalysisPrompt } from "../buildAnalysisPrompt";

describe("buildAnalysisPrompt", () => {
  it("references both the dataset and the area", () => {
    const prompt = buildAnalysisPrompt({
      areaName: "Pará, Brazil",
      datasetId: 1,
      datasetName: "Tree cover loss",
    });
    expect(prompt).toBe("Analyse Tree cover loss in Pará, Brazil.");
  });
});
