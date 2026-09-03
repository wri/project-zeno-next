// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// Keep the detail query off the network (we seed the cache instead), and spy on
// the widget add/remove calls.
vi.mock("../../api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDashboard: vi.fn(() => new Promise(() => {})),
  addInsightWidget: vi.fn().mockResolvedValue(undefined),
  deleteWidget: vi.fn().mockResolvedValue(undefined),
}));

import { addInsightWidget, deleteWidget } from "../../api/dashboards";
import { dashboardKeys } from "../dashboardQueries";
import { useAddInsightToDashboard } from "../useAddInsightToDashboard";
import type { Dashboard } from "../../api/schemas";
import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";

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
  widgets: [
    {
      id: "w-existing",
      position: 0,
      widget_type: "insight",
      insight_id: "already-added",
      config: {},
      created_at: "2026-07-01T00:00:00Z",
      insight: null,
    },
  ],
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

describe("useAddInsightToDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ userId: "u1" });
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d1" });
  });

  it("is inactive off a dashboard surface", () => {
    useViewContextStore.getState().setViewContext({ page: "map" });
    const { result } = renderHook(() => useAddInsightToDashboard("ins-1"), {
      wrapper: makeWrapper(dashboard),
    });
    expect(result.current.active).toBe(false);
    expect(result.current.addable).toBe(false);
  });

  it("adds a new insight as a widget", async () => {
    const { result } = renderHook(() => useAddInsightToDashboard("ins-new"), {
      wrapper: makeWrapper(dashboard),
    });

    expect(result.current.addable).toBe(true);
    expect(result.current.added).toBe(false);

    act(() => result.current.toggle());

    await waitFor(() =>
      expect(addInsightWidget).toHaveBeenCalledWith("d1", "ins-new", undefined)
    );
    expect(deleteWidget).not.toHaveBeenCalled();
  });

  it("ignores a second add while the first is still settling (no duplicate widget)", async () => {
    const { result } = renderHook(() => useAddInsightToDashboard("ins-new"), {
      wrapper: makeWrapper(dashboard),
    });

    act(() => result.current.toggle());
    await waitFor(() => expect(addInsightWidget).toHaveBeenCalledTimes(1));

    // The POST has resolved, but the detail refetch (mocked to hang) has not,
    // so the mutation must stay pending and a fast second click is a no-op —
    // otherwise it would re-POST and create a duplicate widget.
    expect(result.current.pending).toBe(true);
    act(() => result.current.toggle());
    expect(addInsightWidget).toHaveBeenCalledTimes(1);
  });

  it("removes the insight's widget when it is already on the dashboard", async () => {
    const { result } = renderHook(
      () => useAddInsightToDashboard("already-added"),
      { wrapper: makeWrapper(dashboard) }
    );

    expect(result.current.added).toBe(true);

    act(() => result.current.toggle());

    await waitFor(() =>
      expect(deleteWidget).toHaveBeenCalledWith("d1", "w-existing")
    );
    expect(addInsightWidget).not.toHaveBeenCalled();
  });

  it("is not addable without a real insight id", () => {
    const { result } = renderHook(() => useAddInsightToDashboard(undefined), {
      wrapper: makeWrapper(dashboard),
    });
    expect(result.current.active).toBe(true);
    expect(result.current.addable).toBe(false);

    act(() => result.current.toggle());
    expect(addInsightWidget).not.toHaveBeenCalled();
  });

  it("is not addable on a dashboard the viewer does not own", () => {
    useAuthStore.setState({ userId: "someone-else" });
    const { result } = renderHook(() => useAddInsightToDashboard("ins-1"), {
      wrapper: makeWrapper(dashboard),
    });
    expect(result.current.addable).toBe(false);
  });

  describe("removeNeedsConfirm", () => {
    function withExistingConfig(config: Record<string, unknown>) {
      return {
        ...dashboard,
        widgets: [{ ...dashboard.widgets[0], config }],
      };
    }

    it("is false when nothing has been added", () => {
      const { result } = renderHook(() => useAddInsightToDashboard("ins-new"), {
        wrapper: makeWrapper(dashboard),
      });
      expect(result.current.removeNeedsConfirm).toBe(false);
    });

    it("is false for a widget added whole and left alone", () => {
      const { result } = renderHook(
        () => useAddInsightToDashboard("already-added"),
        { wrapper: makeWrapper(withExistingConfig({})) }
      );
      expect(result.current.added).toBe(true);
      expect(result.current.removeNeedsConfirm).toBe(false);
    });

    it("is true once the module carries a hand-arranged config", () => {
      const { result } = renderHook(
        () => useAddInsightToDashboard("already-added"),
        {
          wrapper: makeWrapper(
            withExistingConfig({ sizes: { "c-1": "double" } })
          ),
        }
      );
      expect(result.current.removeNeedsConfirm).toBe(true);
    });
  });
});
