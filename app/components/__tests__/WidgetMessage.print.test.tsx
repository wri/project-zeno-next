// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
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
// The scroller only matters by its presence: paper has no scroll.
vi.mock("@/app/components/widgets/ScrollableTableWrapper", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="table-scroller">{children}</div>
  ),
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

  it("prints a table unscrolled, its headers wrapping to fit the page", () => {
    renderCard(widget("table"), true);

    expect(screen.queryByTestId("table-scroller")).toBeNull();
    const header = screen.getAllByRole("columnheader")[0];
    expect(getComputedStyle(header).whiteSpace).toBe("normal");
  });

  it("keeps a dashboard table in its horizontal scroller", () => {
    renderCard(widget("table"), false);

    expect(screen.getByTestId("table-scroller")).toBeTruthy();
    const header = screen.getAllByRole("columnheader")[0];
    expect(getComputedStyle(header).whiteSpace).toBe("pre");
  });

  describe("a ranking of areas", () => {
    const ranking: InsightWidget = {
      id: "w-ranking",
      type: "ranked-bar",
      title: "Tree Cover Loss by Area",
      description: "",
      data: Array.from({ length: 12 }, (_, i) => ({
        rank: i + 1,
        aoi_id: `KEN.${i}`,
        name: `County ${i}`,
        parent: "Kenya",
        area_ha: 1000 - i,
      })),
      xAxis: "name",
      yAxis: "area_ha",
    };

    it("draws its own bars in the card and in the export, not ChartWidget", () => {
      for (const print of [false, true]) {
        const { unmount } = renderCard(ranking, print);
        expect(screen.queryByTestId("chart")).toBeNull();
        expect(screen.getByRole("list", { name: /areas/i })).toBeTruthy();
        unmount();
      }
    });

    it("prints the first ten areas with the note, and no controls", () => {
      renderCard(ranking, true);

      expect(screen.getAllByRole("listitem")).toHaveLength(10);
      expect(screen.getByText("Top 10 of 12 areas.")).toBeTruthy();
      for (const name of CONTROLS) {
        expect(screen.queryByRole("button", { name })).toBeNull();
      }
    });

    it("shows its table without the area id", () => {
      renderCard(ranking, false);
      fireEvent.click(screen.getByRole("button", { name: /^table$/i }));

      const headers = screen
        .getAllByRole("columnheader")
        .map((header) => header.textContent ?? "");
      expect(headers.some((text) => /aoi id/i.test(text))).toBe(false);
      expect(headers[0]).toMatch(/rank/i);
      expect(headers[1]).toMatch(/name/i);
    });
  });
});
