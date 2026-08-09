// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// Chart bodies and map bodies are their components' contracts — stub them so
// this test asserts the grid's grouping structure only.
vi.mock("@/app/components/WidgetMessage", () => ({
  default: ({ widget }: { widget: { title: string } }) => (
    <div data-testid="widget-message">{widget.title}</div>
  ),
}));
vi.mock("../DashboardMapWidget", () => ({
  default: () => <div data-testid="map-widget" />,
}));

import DashboardWidgetsGrid from "../DashboardWidgetsGrid";
import type { Dashboard, DashboardWidget } from "../../api/schemas";
import useAuthStore from "@/app/store/authStore";

const insightWidget: DashboardWidget = {
  id: "w-ins",
  position: 0,
  widget_type: "insight",
  insight_id: "ins-1",
  config: {},
  created_at: "2026-07-01T00:00:00Z",
  insight: {
    id: "ins-1",
    insight_text: "Alerts spiked in July.",
    codeact_parts: null,
    charts: [
      {
        id: "c-1",
        position: 0,
        title: "Alerts trend",
        chart_type: "line",
        x_axis: "year",
        y_axis: "area",
        series_fields: null,
        chart_data: [],
      },
      {
        id: "c-2",
        position: 1,
        title: "Alerts by driver",
        chart_type: "bar",
        x_axis: "driver",
        y_axis: "area",
        series_fields: null,
        chart_data: [],
      },
    ],
  },
};

const mapWidget: DashboardWidget = {
  id: "w-map",
  position: 1,
  widget_type: "map",
  config: {
    dataset: {
      tile_url: "https://example.test/{z}/{x}/{y}.png",
      dataset_name: "DIST-ALERT",
    },
  },
  created_at: "2026-07-01T00:00:00Z",
  insight: null,
};

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Test",
  description: null,
  is_public: false,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  aois: [
    {
      source: "gadm",
      src_id: "BRA",
      subtype: "country",
      name: "Brazil",
      id: "a1",
      position: 0,
    },
  ],
  widgets: [insightWidget, mapWidget],
};

describe("DashboardWidgetsGrid grouping", () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: "u1" });
  });

  it("renders an insight widget as one module with its charts, beside standalone widgets", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider value={defaultSystem}>
          <DashboardWidgetsGrid dashboard={dashboard} />
        </ChakraProvider>
      </QueryClientProvider>
    );

    // The module: one header (first chart's title), the narrative, both charts.
    expect(screen.getByText("Alerts spiked in July.")).toBeTruthy();
    const cards = screen.getAllByTestId("widget-message");
    expect(cards.map((c) => c.textContent)).toEqual([
      "Alerts trend",
      "Alerts by driver",
    ]);
    // The map widget still renders standalone.
    expect(screen.getByTestId("map-widget")).toBeTruthy();
    // Whole-module remove exists exactly once (one insight module).
    expect(
      screen.getAllByLabelText("Remove analysis from dashboard")
    ).toHaveLength(1);
  });
});
