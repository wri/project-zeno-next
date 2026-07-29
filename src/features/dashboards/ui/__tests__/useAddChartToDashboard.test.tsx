// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

vi.mock("../../api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDashboard: vi.fn(() => new Promise(() => {})),
  addInsightWidget: vi.fn().mockResolvedValue(undefined),
  updateWidget: vi.fn().mockResolvedValue(undefined),
  deleteWidget: vi.fn().mockResolvedValue(undefined),
}));

import {
  addInsightWidget,
  deleteWidget,
  updateWidget,
} from "../../api/dashboards";
import { dashboardKeys } from "../dashboardQueries";
import { useAddChartToDashboard } from "../useAddChartToDashboard";
import type { Dashboard } from "../../api/schemas";
import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";

function chart(id: string, position: number) {
  return {
    id,
    position,
    title: id,
    chart_type: "bar",
    x_axis: "year",
    y_axis: "loss_ha",
    series_fields: null,
    chart_data: [],
  };
}

/** A dashboard whose single insight widget ("ins-1") shows the given chart set
 *  (config.chartIds; omit for all). The insight has three charts (c-a, c-b, c-c)
 *  so a two-chart subset stays explicit rather than collapsing to "all". */
function dashboardWith(chartIds?: string[]): Dashboard {
  return {
    id: "d1",
    user_id: "u1",
    name: "Pará",
    description: null,
    is_public: false,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    aois: [],
    widgets: [
      {
        id: "w-1",
        position: 0,
        widget_type: "insight",
        insight_id: "ins-1",
        config: chartIds ? { chartIds } : {},
        created_at: "2026-07-01T00:00:00Z",
        insight: {
          id: "ins-1",
          insight_text: "",
          codeact_parts: null,
          charts: [chart("c-a", 0), chart("c-b", 1), chart("c-c", 2)],
        },
      },
    ],
  };
}

function makeWrapper(seed: Dashboard) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(dashboardKeys.detail(seed.id), seed);
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useAddChartToDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ userId: "u1" });
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d1" });
  });

  it("adds the first chart of an analysis as a new widget carrying config.chartIds", async () => {
    const { result } = renderHook(
      () => useAddChartToDashboard("ins-new", "c-x"),
      { wrapper: makeWrapper(dashboardWith()) }
    );

    expect(result.current.shown).toBe(false);
    act(() => result.current.toggle());

    await waitFor(() =>
      expect(addInsightWidget).toHaveBeenCalledWith("d1", "ins-new", {
        chartIds: ["c-x"],
      })
    );
  });

  it("adds a second chart by patching the widget's config", async () => {
    const { result } = renderHook(
      () => useAddChartToDashboard("ins-1", "c-b"),
      {
        wrapper: makeWrapper(dashboardWith(["c-a"])),
      }
    );

    expect(result.current.shown).toBe(false);
    act(() => result.current.toggle());

    await waitFor(() =>
      expect(updateWidget).toHaveBeenCalledWith("d1", "w-1", {
        config: { chartIds: ["c-a", "c-b"] },
      })
    );
  });

  it("hides a shown chart by patching config (not the last one)", async () => {
    const { result } = renderHook(
      () => useAddChartToDashboard("ins-1", "c-a"),
      {
        wrapper: makeWrapper(dashboardWith(["c-a", "c-b"])),
      }
    );

    expect(result.current.shown).toBe(true);
    act(() => result.current.toggle());

    await waitFor(() =>
      expect(updateWidget).toHaveBeenCalledWith("d1", "w-1", {
        config: { chartIds: ["c-b"] },
      })
    );
    expect(deleteWidget).not.toHaveBeenCalled();
  });

  it("deletes the widget when its last shown chart is hidden", async () => {
    const { result } = renderHook(
      () => useAddChartToDashboard("ins-1", "c-a"),
      {
        wrapper: makeWrapper(dashboardWith(["c-a"])),
      }
    );

    expect(result.current.shown).toBe(true);
    act(() => result.current.toggle());

    await waitFor(() => expect(deleteWidget).toHaveBeenCalledWith("d1", "w-1"));
    expect(updateWidget).not.toHaveBeenCalled();
  });

  it("is not addable off a dashboard or without ids", () => {
    useViewContextStore.getState().setViewContext({ page: "map" });
    const { result } = renderHook(
      () => useAddChartToDashboard("ins-1", "c-a"),
      {
        wrapper: makeWrapper(dashboardWith(["c-a"])),
      }
    );
    expect(result.current.active).toBe(false);
    expect(result.current.addable).toBe(false);
  });
});
