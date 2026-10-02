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
import { useCurrentDashboardArea } from "../useCurrentDashboardArea";
import type { Dashboard } from "../../api/schemas";
import useViewContextStore from "@/app/store/viewContextStore";

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Pará forest watch",
  description: null,
  is_public: false,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  aois: [
    {
      id: "aoi-1",
      position: 0,
      source: "gadm",
      src_id: "BRA.14_1",
      subtype: "state-province",
      name: "Pará",
    },
  ],
  sections: [],
  widgets: [],
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

describe("useCurrentDashboardArea", () => {
  beforeEach(() => {
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d1" });
  });

  it("exposes the dashboard AOI's full identity", () => {
    const { result } = renderHook(() => useCurrentDashboardArea(), {
      wrapper: makeWrapper(dashboard),
    });
    expect(result.current).toEqual({
      aoiSource: "gadm",
      aoiId: "BRA.14_1",
      subtype: "state-province",
      name: "Pará",
    });
  });

  it("is null off a dashboard surface", () => {
    useViewContextStore.getState().setViewContext({ page: "map" });
    const { result } = renderHook(() => useCurrentDashboardArea(), {
      wrapper: makeWrapper(dashboard),
    });
    expect(result.current).toBeNull();
  });

  it("is null before the dashboard detail has resolved", () => {
    const { result } = renderHook(() => useCurrentDashboardArea(), {
      wrapper: makeWrapper(null),
    });
    expect(result.current).toBeNull();
  });

  it("is null for a dashboard with no AOI", () => {
    const { result } = renderHook(() => useCurrentDashboardArea(), {
      wrapper: makeWrapper({ ...dashboard, aois: [] }),
    });
    expect(result.current).toBeNull();
  });
});
