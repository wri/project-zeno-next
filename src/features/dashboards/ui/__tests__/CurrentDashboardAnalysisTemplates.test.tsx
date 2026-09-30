// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

vi.mock("../../api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDashboard: vi.fn(() => new Promise(() => {})),
  listAnalysisTemplates: vi.fn(),
  applyAnalysisTemplate: vi.fn(() => new Promise(() => {})),
}));

import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";
import {
  applyAnalysisTemplate,
  listAnalysisTemplates,
} from "../../api/dashboards";
import type { Dashboard } from "../../api/schemas";
import { ANALYSIS_TEMPLATES_BLURB } from "../../lib/analysis-templates";
import CurrentDashboardAnalysisTemplates from "../CurrentDashboardAnalysisTemplates";
import DashboardAnalysisTemplates from "../DashboardAnalysisTemplates";
import { dashboardKeys } from "../dashboardQueries";

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Paraná",
  description: null,
  is_public: false,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  aois: [
    {
      id: "a1",
      position: 0,
      source: "gadm",
      src_id: "BRA.18_1",
      subtype: "state-province",
      name: "Paraná",
    },
  ],
  sections: [],
  widgets: [],
};

// The card shows the design's copy; the registry's own label differs.
const LABEL = "Near real-time monitoring";

const renderPane = ({
  seed = true,
  withFooter = false,
}: { seed?: boolean; withFooter?: boolean } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (seed) queryClient.setQueryData(dashboardKeys.detail("d1"), dashboard);
  render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <CurrentDashboardAnalysisTemplates />
        {withFooter && <DashboardAnalysisTemplates dashboard={dashboard} />}
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe("CurrentDashboardAnalysisTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listAnalysisTemplates).mockResolvedValue([
      {
        name: "nrt-monitoring",
        label: "Near-real-time monitoring",
        args_schema: {},
        widgets: ["chart", "layer", "imagery"],
      },
    ]);
    useAuthStore.setState({ userId: "u1" });
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d1" });
  });

  it("offers the current dashboard's templates to its owner", async () => {
    renderPane();

    expect(screen.getByText(ANALYSIS_TEMPLATES_BLURB)).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: LABEL }));

    await waitFor(() =>
      expect(applyAnalysisTemplate).toHaveBeenCalledWith("d1", "nrt-monitoring")
    );
  });

  it("holds the footer's card inert while the pane's request is in flight", async () => {
    renderPane({ withFooter: true });

    const [paneCard] = await screen.findAllByRole("button", { name: LABEL });
    fireEvent.click(paneCard);

    await waitFor(() =>
      screen
        .getAllByRole("button", { name: LABEL })
        .forEach((card) =>
          expect(card.getAttribute("aria-disabled")).toBe("true")
        )
    );
    fireEvent.click(screen.getAllByRole("button", { name: LABEL })[1]);
    expect(applyAnalysisTemplate).toHaveBeenCalledTimes(1);
  });

  it("tells a viewer that only the owner can add a template", () => {
    useAuthStore.setState({ userId: "visitor" });
    renderPane();

    expect(screen.getByText(/only the dashboard's owner/i)).toBeTruthy();
    expect(screen.queryByText(ANALYSIS_TEMPLATES_BLURB)).toBeNull();
    expect(screen.queryByRole("button", { name: LABEL })).toBeNull();
  });

  it("waits for the dashboard before offering anything", () => {
    renderPane({ seed: false });

    expect(screen.getByText("Loading this dashboard...")).toBeTruthy();
  });
});
