// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// The chart body needs a real canvas/measurement stack (recharts); the
// variants under test only decide which chrome surrounds it — stub it.
vi.mock("../widgets/ChartWidget", () => ({
  __esModule: true,
  default: () => <div data-testid="chart-body" />,
  AXIS_FIT_TYPES: new Set(["line", "area", "scatter"]),
}));
vi.mock("../InsightCaption", () => ({
  __esModule: true,
  default: () => <div data-testid="insight-caption" />,
}));
vi.mock("../InsightProvenanceDrawer", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("@/src/features/dashboards/ui/AddToDashboardToggle", () => ({
  __esModule: true,
  default: () => <div data-testid="add-to-dashboard" />,
}));

import WidgetMessage from "../WidgetMessage";
import type { InsightWidget } from "@/app/types/chat";

const widget: InsightWidget = {
  id: "c1",
  type: "bar",
  title: "Tree cover loss by year",
  description: "",
  data: [
    { year: 2023, loss: 30.2 },
    { year: 2024, loss: 27.8 },
  ],
  xAxis: "year",
  yAxis: "loss",
  insightId: "i1",
};

const renderVariant = (props: React.ComponentProps<typeof WidgetMessage>) =>
  render(
    <ChakraProvider value={defaultSystem}>
      <WidgetMessage {...props} />
    </ChakraProvider>
  );

describe("WidgetMessage variants", () => {
  it("chat (default) renders the title header, toolbar and action row", () => {
    const { getByText, queryByTestId } = renderVariant({ widget });
    expect(getByText("Tree cover loss by year")).toBeTruthy();
    expect(getByText("Chart")).toBeTruthy();
    expect(getByText("Table")).toBeTruthy();
    expect(getByText("Download")).toBeTruthy();
    expect(queryByTestId("add-to-dashboard")).toBeTruthy();
    expect(queryByTestId("insight-caption")).toBeNull();
  });

  it("workspace renders caption + toolbar but no chat header or dashboard toggle", () => {
    const { queryByText, queryByTestId } = renderVariant({
      widget,
      variant: "workspace",
    });
    expect(queryByText("Tree cover loss by year")).toBeNull();
    expect(queryByText("Chart")).toBeTruthy();
    expect(queryByText("Download")).toBeTruthy();
    expect(queryByTestId("insight-caption")).toBeTruthy();
    expect(queryByTestId("add-to-dashboard")).toBeNull();
  });

  it("report strips every affordance but keeps the chart body", () => {
    const { queryByText, queryByTestId } = renderVariant({
      widget,
      variant: "report",
    });
    expect(queryByTestId("chart-body")).toBeTruthy();
    expect(queryByText("Chart")).toBeNull();
    expect(queryByText("Table")).toBeNull();
    expect(queryByText("Full-screen")).toBeNull();
    expect(queryByText("Download")).toBeNull();
    expect(queryByText("Continue in...")).toBeNull();
    expect(queryByTestId("insight-caption")).toBeNull();
    expect(queryByTestId("add-to-dashboard")).toBeNull();
  });
});
