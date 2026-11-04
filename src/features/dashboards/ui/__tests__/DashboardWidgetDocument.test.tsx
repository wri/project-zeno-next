// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { InsightWidget } from "@/app/types/chat";
import type { AnalysisInputs } from "@/src/entities/insight";

// The body (chart, map) is not what this test reads.
vi.mock("../DashboardWidgetBody", () => ({ default: () => null }));

import DashboardWidgetDocument from "../DashboardWidgetDocument";

const card = (analysisInputs: AnalysisInputs): InsightWidget => ({
  type: "bar",
  title: "Annual tree cover loss",
  description: "",
  data: [],
  xAxis: "year",
  yAxis: "loss_ha",
  analysisInputs,
});

const renderDocument = (analysisInputs: AnalysisInputs) =>
  render(
    <ChakraProvider value={defaultSystem}>
      <DashboardWidgetDocument
        title="Annual tree cover loss"
        card={card(analysisInputs)}
        isDouble={false}
      />
    </ChakraProvider>
  );

describe("DashboardWidgetDocument", () => {
  it("prints every recorded area, with no +N to hover", () => {
    renderDocument({
      recorded: true,
      areas: ["A", "B", "C", "D"].map((name) => ({ name })),
      datasets: [{ name: "Tree cover loss" }],
      canopyCover: [],
      years: [],
    });
    for (const name of ["A", "B", "C", "D"]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.queryByText("+1")).toBeNull();
  });

  it("prints no inputs row and no note when the inputs were not recorded", () => {
    renderDocument({ recorded: false });
    expect(screen.queryByText("AREA")).toBeNull();
    expect(screen.queryByText(/not recorded/)).toBeNull();
  });
});
