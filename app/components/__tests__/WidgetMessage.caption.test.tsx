// @vitest-environment happy-dom
/**
 * Every chart card says where it came from (PZB-1738): in chat as well as in
 * the workspace, and on paper without the hover-only "Learn more".
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
  it("labels a chat card with its source dataset", () => {
    renderCard(widget({ datasetName: "Tree cover loss" }));

    expect(caption().textContent).toBe("SOURCE: Tree cover loss · Learn more");
  });

  it("labels an AI chart in chat and keeps its disclaimer block", () => {
    renderCard(
      widget({
        curated: false,
        generation: { code: "print(1)" } as InsightWidget["generation"],
      })
    );

    expect(caption().textContent).toBe("AI-ASSISTED · Learn more");
    expect(screen.getByText(/AI models may produce/)).toBeTruthy();
  });

  it("names a direct analysis's dataset from its parameters", () => {
    renderCard(
      widget({ analysisParams: { areas: ["Pará"], dataset: "Tree cover" } }),
      { inWorkspace: true }
    );

    expect(caption().textContent).toBe("SOURCE: Tree cover · Learn more");
  });

  it("prints the caption without Learn more", () => {
    renderCard(widget({ datasetName: "Tree cover loss" }), {
      inWorkspace: true,
      print: true,
    });

    expect(caption().textContent).toBe("SOURCE: Tree cover loss");
  });
});
