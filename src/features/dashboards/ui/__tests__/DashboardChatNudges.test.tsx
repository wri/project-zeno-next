// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The chatStore import chain reaches the Chakra toaster (.tsx) — stub it so the
// test environment can parse the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// Keep the unseeded-cache path off the network: the query mounts and calls
// getDashboard, which must hang (pending) rather than hit the API host.
vi.mock("../../api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDashboard: vi.fn(() => new Promise(() => {})),
}));

import DashboardChatNudges from "../DashboardChatNudges";
import { dashboardKeys } from "../dashboardQueries";
import type { Dashboard } from "../../api/schemas";
import useChatStore from "@/app/store/chatStore";
import useViewContextStore from "@/app/store/viewContextStore";

const emptyDashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Pará forest watch",
  description: null,
  is_public: false,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  aois: [],
  sections: [],
  widgets: [],
};

const populatedDashboard: Dashboard = {
  ...emptyDashboard,
  sections: [],
  widgets: [
    {
      id: "w1",
      position: 0,
      widget_type: "insight",
      insight_id: "i1",
      config: {},
      created_at: "2026-07-01T00:00:00Z",
      insight: null,
    },
  ],
};

const sendSpy = vi.fn().mockResolvedValue({ isNew: true, id: "t1" });

const renderWithDashboard = (ui: ReactElement, dashboard: Dashboard | null) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (dashboard) {
    queryClient.setQueryData(dashboardKeys.detail(dashboard.id), dashboard);
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>
    </QueryClientProvider>
  );
};

describe("DashboardChatNudges", () => {
  beforeEach(() => {
    sendSpy.mockClear();
    useChatStore.setState({ sendMessage: sendSpy });
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d1" });
  });

  it("shows the build variant for an empty dashboard", () => {
    renderWithDashboard(<DashboardChatNudges showChips />, emptyDashboard);

    expect(screen.getByText("Start building this dashboard")).toBeTruthy();
    expect(screen.getByText("You might want to:")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /Add a satellite imagery map of this area/i,
      })
    ).toBeTruthy();
  });

  it("shows the refine variant once the dashboard has widgets", () => {
    renderWithDashboard(<DashboardChatNudges showChips />, populatedDashboard);

    expect(screen.getByText("Refine this dashboard")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /Summarize what this dashboard shows/i,
      })
    ).toBeTruthy();
  });

  it("sends the chip text as a chat message on click", () => {
    renderWithDashboard(<DashboardChatNudges showChips />, emptyDashboard);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Add a satellite imagery map of this area/i,
      })
    );

    expect(sendSpy).toHaveBeenCalledWith(
      "Add a satellite imagery map of this area"
    );
  });

  it("keeps the greeting but hides the chips once a prompt was sent", () => {
    renderWithDashboard(
      <DashboardChatNudges showChips={false} />,
      emptyDashboard
    );

    expect(screen.getByText("Start building this dashboard")).toBeTruthy();
    expect(screen.queryByText("You might want to:")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders nothing until the dashboard resolves", () => {
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d-missing" });

    const { container } = renderWithDashboard(
      <DashboardChatNudges showChips />,
      null
    );

    expect(container.textContent).toBe("");
  });
});
