// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Dashboard } from "../../api/schemas";
import { useDashboardAlertsSummary } from "../../hooks/useDashboardAlertsSummary";
import { useIntegratedAlertsFreshness } from "../../hooks/useIntegratedAlertsFreshness";
import DashboardsPage from "../DashboardsPage";
import { useDashboards } from "../dashboardQueries";

vi.mock("../dashboardQueries", () => ({ useDashboards: vi.fn() }));
vi.mock("../../hooks/useDashboardAlertsSummary", () => ({
  useDashboardAlertsSummary: vi.fn(),
}));
vi.mock("../../hooks/useIntegratedAlertsFreshness", () => ({
  useIntegratedAlertsFreshness: vi.fn(),
}));
vi.mock("../NewDashboardScreen", () => ({ NewDashboardScreen: () => null }));
vi.mock("../DashboardsAlertsOverview", () => ({ default: () => null }));
vi.mock("../DashboardCard", () => ({
  default: ({
    dashboard,
    alertsLoading,
  }: {
    dashboard: Dashboard;
    alertsLoading: boolean;
  }) => (
    <div data-testid="dashboard-card" data-alerts-loading={alertsLoading}>
      {dashboard.name}
    </div>
  ),
}));

const dashboard = (id: string): Dashboard => ({
  id,
  user_id: "u1",
  name: `Dashboard ${id}`,
  is_public: false,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-20T00:00:00Z",
  aois: [],
  sections: [],
  widgets: [],
});

const listState = (state: { data?: Dashboard[]; isLoading: boolean }) =>
  vi
    .mocked(useDashboards)
    .mockReturnValue({ isError: false, ...state } as ReturnType<
      typeof useDashboards
    >);

const alertsState = (summaryLoading: boolean, freshnessLoading = false) => {
  vi.mocked(useDashboardAlertsSummary).mockReturnValue({
    data: undefined,
    isLoading: summaryLoading,
  } as ReturnType<typeof useDashboardAlertsSummary>);
  vi.mocked(useIntegratedAlertsFreshness).mockReturnValue({
    data: undefined,
    isLoading: freshnessLoading,
  } as ReturnType<typeof useIntegratedAlertsFreshness>);
};

const renderPage = () =>
  render(
    <ChakraProvider value={defaultSystem}>
      <DashboardsPage />
    </ChakraProvider>
  );

const skeletons = () => screen.queryAllByTestId("dashboard-card-skeleton");
const cards = () => screen.queryAllByTestId("dashboard-card");

describe("DashboardsPage reveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a row of card skeletons while the list loads", () => {
    listState({ data: undefined, isLoading: true });
    alertsState(false);
    renderPage();

    expect(skeletons()).toHaveLength(4);
    expect(cards()).toHaveLength(0);
    expect(screen.getByText("Loading dashboards...")).toBeTruthy();
  });

  it.each([
    ["the summary", true, false],
    ["the dates", false, true],
  ])(
    "holds one skeleton per card while %s load",
    (_, summaryLoading, freshnessLoading) => {
      listState({ data: [dashboard("a"), dashboard("b")], isLoading: false });
      alertsState(summaryLoading, freshnessLoading);
      renderPage();

      expect(skeletons()).toHaveLength(2);
      expect(cards()).toHaveLength(0);
    }
  );

  it("shows the cards after the wait, their badges still loading", () => {
    listState({ data: [dashboard("a"), dashboard("b")], isLoading: false });
    alertsState(true);
    renderPage();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(skeletons()).toHaveLength(0);
    expect(cards()).toHaveLength(2);
    expect(cards()[0].getAttribute("data-alerts-loading")).toBe("true");
  });

  it("shows the cards at once when the alerts have settled, failed or not", () => {
    listState({ data: [dashboard("a"), dashboard("b")], isLoading: false });
    alertsState(false);
    renderPage();

    expect(skeletons()).toHaveLength(0);
    expect(cards()).toHaveLength(2);
  });
});
