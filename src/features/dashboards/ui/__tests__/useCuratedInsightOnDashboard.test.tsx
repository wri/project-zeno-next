// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Keep the detail query off the network; the cache is seeded instead.
vi.mock("../../api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDashboard: vi.fn(() => new Promise(() => {})),
}));

import { dashboardKeys } from "../dashboardQueries";
import { useCuratedInsightOnDashboard } from "../useCuratedInsightOnDashboard";
import type { Dashboard, DashboardWidget } from "../../api/schemas";
import useViewContextStore from "@/app/store/viewContextStore";

const curatedWidget: DashboardWidget = {
  id: "w-tcl",
  position: 0,
  widget_type: "insight",
  insight_id: "ins-tcl",
  config: {},
  created_at: "2026-07-01T00:00:00Z",
  insight: {
    id: "ins-tcl",
    insight_text: "",
    codeact_parts: [],
    charts: [
      {
        id: "c-1",
        position: 0,
        title: "Annual tree cover loss",
        chart_type: "bar",
        x_axis: "year",
        y_axis: "loss_ha",
        series_fields: null,
        chart_data: [],
        dataset_id: 4,
      },
    ],
  },
};

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Pará forest watch",
  description: null,
  is_public: false,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  aois: [],
  sections: [],
  widgets: [curatedWidget],
};

function makeWrapper(seed: Dashboard | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (seed) {
    queryClient.setQueryData(dashboardKeys.detail(seed.id), seed);
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useCuratedInsightOnDashboard", () => {
  beforeEach(() => {
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d1" });
  });

  it("returns the insight id of the curated widget for the dataset", () => {
    const { result } = renderHook(() => useCuratedInsightOnDashboard(4), {
      wrapper: makeWrapper(dashboard),
    });
    expect(result.current).toBe("ins-tcl");
  });

  it("returns undefined when no curated widget matches the dataset", () => {
    const { result } = renderHook(() => useCuratedInsightOnDashboard(5), {
      wrapper: makeWrapper(dashboard),
    });
    expect(result.current).toBeUndefined();
  });

  it("returns undefined off a dashboard surface", () => {
    useViewContextStore.getState().setViewContext({ page: "map" });
    const { result } = renderHook(() => useCuratedInsightOnDashboard(4), {
      wrapper: makeWrapper(dashboard),
    });
    expect(result.current).toBeUndefined();
  });

  it("returns undefined before the dashboard detail has resolved", () => {
    const { result } = renderHook(() => useCuratedInsightOnDashboard(4), {
      wrapper: makeWrapper(null),
    });
    expect(result.current).toBeUndefined();
  });
});
