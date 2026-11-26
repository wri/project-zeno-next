// @vitest-environment happy-dom
/**
 * The chat analysis card's eyebrow says how the analysis was made (PZB-1738),
 * by the same rule as the chart caption.
 */
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnalysisCard } from "../AnalysisCard";
import type { InsightWidget } from "@/app/types/chat";

const widget = (over: Partial<InsightWidget> = {}): InsightWidget => ({
  id: "w-1",
  type: "line",
  title: "Loss in Pará",
  description: "",
  data: [{ year: 2020, area_ha: 1 }],
  xAxis: "year",
  yAxis: "area_ha",
  ...over,
});

const renderCard = (w: InsightWidget) =>
  render(
    <ChakraProvider value={defaultSystem}>
      <AnalysisCard widget={w} />
    </ChakraProvider>
  );

describe("AnalysisCard eyebrow", () => {
  it("reads SOURCE DATA ANALYSIS for a curated widget", () => {
    renderCard(widget({ curated: true }));

    expect(screen.getByText("SOURCE DATA ANALYSIS")).toBeTruthy();
    expect(screen.queryByText("AI-ASSISTED ANALYSIS")).toBeNull();
  });

  it("reads AI-ASSISTED ANALYSIS for a widget with generation and no curated flag", () => {
    renderCard(
      widget({
        generation: { code: "print(1)" } as InsightWidget["generation"],
      })
    );

    expect(screen.getByText("AI-ASSISTED ANALYSIS")).toBeTruthy();
  });

  it("reads SOURCE DATA ANALYSIS for a widget with neither", () => {
    renderCard(widget());

    expect(screen.getByText("SOURCE DATA ANALYSIS")).toBeTruthy();
  });
});
