// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { InsightWidget } from "@/app/types/chat";
import type { AnalysisInputs } from "@/src/entities/insight";

// The chart card is not what these tests read.
vi.mock("@/app/components/WidgetMessage", () => ({ default: () => null }));

import { AnalysedInputsPanel, InsightDetail } from "../insight-card-parts";

const RECORDED: AnalysisInputs = {
  recorded: true,
  areas: [{ name: "Rondônia, Brazil", source: "gadm", srcId: "BRA.22" }],
  datasets: [{ name: "Tree cover loss", id: 4 }],
  canopyCover: [30],
  years: [{ start: 2001, end: 2024 }],
};

const renderIn = (ui: React.ReactElement) =>
  render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);

/** The panel's definition list as "term: value | value" lines. */
function rows(): string[] {
  const panel = screen.getByRole("region", { name: "What was analysed" });
  return Array.from(panel.querySelectorAll("dt")).map((dt) => {
    const values = Array.from(dt.nextElementSibling!.children).map(
      (v) => v.textContent
    );
    return `${dt.textContent}: ${values.join(" | ")}`;
  });
}

describe("AnalysedInputsPanel", () => {
  it("lists the recorded inputs and the run date", () => {
    renderIn(
      <AnalysedInputsPanel inputs={RECORDED} createdAt="2026-10-13T09:30:00" />
    );
    const panel = screen.getByRole("region", { name: "What was analysed" });
    expect(within(panel).getByText("WHAT WAS ANALYSED")).toBeTruthy();
    expect(rows()).toEqual([
      "Area: Rondônia, Brazil",
      "Dataset: Tree cover loss",
      "Canopy density: More than 30%",
      "Years: 2001–24",
      "Run: 13 Oct 2026",
    ]);
  });

  it("leaves out an empty canopy row and an unknown run date", () => {
    renderIn(
      <AnalysedInputsPanel
        inputs={{ ...RECORDED, canopyCover: [] }}
        createdAt=""
      />
    );
    expect(rows()).toEqual([
      "Area: Rondônia, Brazil",
      "Dataset: Tree cover loss",
      "Years: 2001–24",
    ]);
  });

  it("names five areas, then says how many more", () => {
    const areas = ["A", "B", "C", "D", "E", "F", "G"].map((name) => ({ name }));
    renderIn(
      <AnalysedInputsPanel inputs={{ ...RECORDED, areas }} createdAt="" />
    );
    expect(rows()[0]).toBe("Area: A | B | C | D | E | and 2 more");
  });

  it("says the inputs were not recorded, and keeps the run date", () => {
    renderIn(
      <AnalysedInputsPanel
        inputs={{ recorded: false }}
        createdAt="2026-10-13T09:30:00"
      />
    );
    expect(
      screen.getByText("Inputs were not recorded for this analysis")
    ).toBeTruthy();
    expect(rows()).toEqual(["Run: 13 Oct 2026"]);
  });
});

describe("InsightDetail", () => {
  const widget = (analysisInputs?: AnalysisInputs): InsightWidget => ({
    id: "c-1",
    type: "bar",
    title: "Annual tree cover loss",
    description: "",
    data: [],
    xAxis: "year",
    yAxis: "loss_ha",
    analysisInputs,
  });

  const renderDetail = (w: InsightWidget) =>
    renderIn(
      <InsightDetail
        widgets={[w]}
        index={0}
        onIndexChange={() => {}}
        onBack={() => {}}
        unit="analysis"
        createdAt="2026-10-13T09:30:00"
      />
    );

  it("shows the panel for an analysis", () => {
    renderDetail(widget(RECORDED));
    expect(rows()).toContain("Run: 13 Oct 2026");
  });

  it("shows no panel for a widget that is not an analysis", () => {
    renderDetail(widget(undefined));
    expect(
      screen.queryByRole("region", { name: "What was analysed" })
    ).toBeNull();
  });
});
