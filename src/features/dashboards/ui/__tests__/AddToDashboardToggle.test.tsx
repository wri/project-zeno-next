// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// Keep the detail query off the network (the cache is seeded instead) and spy
// on the widget add/remove calls.
vi.mock("../../api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDashboard: vi.fn(() => new Promise(() => {})),
  addInsightWidget: vi.fn().mockResolvedValue(undefined),
  deleteWidget: vi.fn().mockResolvedValue(undefined),
}));

import { deleteWidget } from "../../api/dashboards";
import { dashboardKeys } from "../dashboardQueries";
import AddToDashboardToggle from "../AddToDashboardToggle";
import type { Dashboard } from "../../api/schemas";
import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";

function dashboardWith(config: Record<string, unknown>): Dashboard {
  return {
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
        config,
        created_at: "2026-07-01T00:00:00Z",
        insight: null,
      },
    ],
  };
}

function renderToggle(seed: Dashboard) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(dashboardKeys.detail(seed.id), seed);
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
      </QueryClientProvider>
    );
  }
  render(<AddToDashboardToggle insightId="already-added" />, {
    wrapper: Wrapper,
  });
}

describe("AddToDashboardToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ userId: "u1" });
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d1" });
  });

  it("removes in one click when the module was never arranged", async () => {
    renderToggle(dashboardWith({}));
    fireEvent.click(screen.getByRole("button", { name: /On dashboard/ }));
    await waitFor(() =>
      expect(deleteWidget).toHaveBeenCalledWith("d1", "w-existing")
    );
  });

  it("confirms first when removing would discard the module's arrangement", async () => {
    renderToggle(dashboardWith({ titles: { "c-1": "Renamed" } }));
    fireEvent.click(screen.getByRole("button", { name: /On dashboard/ }));

    expect(await screen.findByText("Remove analysis?")).toBeTruthy();
    expect(deleteWidget).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() =>
      expect(deleteWidget).toHaveBeenCalledWith("d1", "w-existing")
    );
  });

  it("keeps the widget when the confirmation is cancelled", async () => {
    renderToggle(dashboardWith({ titles: { "c-1": "Renamed" } }));
    fireEvent.click(screen.getByRole("button", { name: /On dashboard/ }));

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(deleteWidget).not.toHaveBeenCalled();
  });
});
