// @vitest-environment happy-dom
/**
 * Every chart card says how it was made (PZB-1738): in the workspace, in a
 * host with no shell of its own (today /chart-debug) and on paper. It names no
 * dataset for now, even when the inputs are recorded: a later PR adds it.
 */
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));
// Chart rendering is ChartWidget's contract; these tests are about the caption.
vi.mock("@/app/components/widgets/ChartWidget", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  default: () => <div data-testid="chart" />,
}));

import WidgetMessage from "../WidgetMessage";
import type { InsightWidget } from "@/app/types/chat";
import type { AnalysisInputs } from "@/src/entities/insight";

const inputs: AnalysisInputs = {
  recorded: true,
  areas: [{ name: "Pará" }],
  datasets: [{ name: "Tree cover loss" }],
  canopyCover: [30],
  years: [{ start: 2001, end: 2024 }],
};

const widget = (over: Partial<InsightWidget> = {}): InsightWidget => ({
  id: "w-1",
  type: "line",
  title: "Loss in Pará",
  description: "",
  data: [{ year: 2020, area_ha: 1 }],
  xAxis: "year",
  yAxis: "area_ha",
  curated: true,
  ...over,
});

const renderCard = (
  w: InsightWidget,
  opts: { inWorkspace?: boolean; print?: boolean } = {}
) =>
  render(
    <ChakraProvider value={defaultSystem}>
      <WidgetMessage widget={w} {...opts} />
    </ChakraProvider>
  );

const caption = () => screen.getByText(/^(SOURCE|AI-ASSISTED)/);

describe("WidgetMessage caption", () => {
  it("labels a curated card SOURCE DATA", () => {
    renderCard(widget());

    expect(caption().textContent).toBe("SOURCE DATA · Learn more");
  });

  it("names no dataset even when the widget carries one", () => {
    renderCard(
      widget({ datasetName: "Tree cover loss", analysisInputs: inputs })
    );

    expect(caption().textContent).toBe("SOURCE DATA · Learn more");
  });

  it("labels an AI chart and keeps its disclaimer block", () => {
    renderCard(
      widget({
        curated: false,
        generation: { code: "print(1)" } as InsightWidget["generation"],
      })
    );

    expect(caption().textContent).toBe("AI-ASSISTED · Learn more");
    expect(screen.getByText(/AI models may produce/)).toBeTruthy();
  });

  it("labels a direct analysis in the workspace SOURCE DATA", () => {
    renderCard(widget({ analysisInputs: inputs }), { inWorkspace: true });

    expect(caption().textContent).toBe("SOURCE DATA · Learn more");
  });

  it("keeps the caption label on a print card", () => {
    renderCard(widget({ datasetName: "Tree cover loss" }), {
      inWorkspace: true,
      print: true,
    });

    // happy-dom cannot apply @media print, so hiding "Learn more" on paper is
    // InsightCaption's CSS and is not asserted here.
    expect(caption().textContent).toContain("SOURCE DATA");
  });
});
