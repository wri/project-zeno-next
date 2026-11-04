import { describe, expect, it } from "vitest";
import { DATASET_BY_ID } from "@/app/constants/datasets";
import type { InsightWidget } from "@/app/types/chat";
import type { AnalysisInputs } from "@/src/entities/insight";
import { buildExportPrompt } from "../exportToAI";

const widget = (analysisInputs: AnalysisInputs): InsightWidget => ({
  type: "bar",
  title: "Annual tree cover loss",
  description: "",
  data: [{ year: 2020, loss_ha: 5 }],
  xAxis: "year",
  yAxis: "loss_ha",
  analysisInputs,
});

const recorded = (
  datasets: { name: string; id?: number }[]
): AnalysisInputs => ({
  recorded: true,
  areas: [{ name: "Acre, Brazil" }],
  datasets,
  canopyCover: [],
  years: [{ start: 2001, end: 2024 }],
});

describe("buildExportPrompt", () => {
  it("names the recorded dataset", () => {
    const [id] = Object.keys(DATASET_BY_ID).map(Number);
    const prompt = buildExportPrompt(
      widget(recorded([{ name: "Recorded name", id }]))
    );
    expect(prompt).toContain("Dataset: Recorded name");
  });

  it.each([
    ["the inputs were not recorded", { recorded: false } as const],
    [
      "the analysis spans several datasets",
      recorded([
        { name: "Tree cover loss", id: 4 },
        { name: "Tree cover gain" },
      ]),
    ],
  ])("names no dataset when %s", (_label, inputs) => {
    const prompt = buildExportPrompt(widget(inputs));
    expect(prompt).not.toContain("Dataset:");
    expect(prompt).not.toContain("Source:");
    expect(prompt).toContain("| year | loss_ha |");
  });
});
