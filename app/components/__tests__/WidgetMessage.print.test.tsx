// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));
// Chart rendering is ChartWidget's contract; these tests are about the card's
// controls around it.
vi.mock("@/app/components/widgets/ChartWidget", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  default: () => <div data-testid="chart" />,
}));

import WidgetMessage from "../WidgetMessage";
import type { InsightWidget } from "@/app/types/chat";

const rows = Array.from({ length: 12 }, (_, i) => ({
  year: 2010 + i,
  area_ha: i,
}));

const widget = (type: InsightWidget["type"]): InsightWidget => ({
  id: `w-${type}`,
  type,
  title: "Tree cover loss",
  description: "",
  data: rows,
  xAxis: "year",
  yAxis: "area_ha",
  generation: { code: "print(1)" } as InsightWidget["generation"],
});

const renderCard = (w: InsightWidget, print: boolean) =>
  render(
    <ChakraProvider value={defaultSystem}>
      <WidgetMessage widget={w} inWorkspace print={print} />
    </ChakraProvider>
  );

const CONTROLS = [
  /^chart$/i,
  /^table$/i,
  /fit y-axis/i,
  /full-screen/i,
  /show working|view how this was generated/i,
  /download/i,
  /continue in|ask ai about this insight/i,
];

describe("WidgetMessage print", () => {
  it("keeps the card's controls on a dashboard", () => {
    renderCard(widget("line"), false);

    for (const name of CONTROLS) {
      expect(screen.getAllByRole("button", { name }).length).toBeGreaterThan(0);
    }
  });

  it("strips every control from the export, keeping the chart", () => {
    renderCard(widget("line"), true);

    expect(screen.getByTestId("chart")).toBeTruthy();
    for (const name of CONTROLS) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });

  it("prints every table row rather than the first page", () => {
    renderCard(widget("table"), true);

    // A header row plus all twelve data rows, and no pager.
    expect(screen.getAllByRole("row")).toHaveLength(rows.length + 1);
    expect(screen.queryByText(/of 12/)).toBeNull();
  });
});
