// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import DashboardHeader from "../DashboardHeader";
import type { Dashboard } from "../../api/schemas";

const baseDashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Paraná, Brazil",
  description: null,
  is_public: false,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
  aois: [],
  widgets: [],
};

const renderHeader = (dashboard: Dashboard) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <DashboardHeader dashboard={dashboard} isOwner />
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe("DashboardHeader", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the 'Created just now' pill for a freshly created dashboard", () => {
    renderHeader({ ...baseDashboard, created_at: new Date().toISOString() });

    expect(screen.getByText("Created just now")).toBeTruthy();
    expect(screen.queryByText(/^Updated/)).toBeNull();
  });

  it("falls back to the usual updated label once the dashboard has aged past the window", () => {
    renderHeader(baseDashboard);

    expect(screen.getByText(/^Updated/)).toBeTruthy();
    expect(screen.queryByText("Created just now")).toBeNull();
  });

  it("demotes the pill to the updated label when the window elapses while the page stays open", () => {
    vi.useFakeTimers();
    // 1 minute of the 10-minute window left at render time.
    renderHeader({
      ...baseDashboard,
      created_at: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    });

    expect(screen.getByText("Created just now")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(61 * 1000);
    });

    expect(screen.queryByText("Created just now")).toBeNull();
    expect(screen.getByText(/^Updated/)).toBeTruthy();
  });
});
