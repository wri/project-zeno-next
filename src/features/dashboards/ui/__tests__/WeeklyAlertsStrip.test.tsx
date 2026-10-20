// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/dashboards", () => ({
  fetchDashboardAlertsSummary: vi.fn(),
}));

import { fetchDashboardAlertsSummary } from "../../api/dashboards";
import { DashboardResponseSchema } from "../../api/schemas";
import type { AlertsSummary } from "../../lib/alerts-summary";
import { INTEGRATED_ALERTS_DATASET_ID } from "../../lib/widgets";
import WeeklyAlertsStrip from "../WeeklyAlertsStrip";

const week = { startDate: "2026-10-05", endDate: "2026-10-11" };

const summaryWith = (areaHa: Record<string, number>): AlertsSummary => ({
  ...week,
  assessedCount: Object.keys(areaHa).length,
  newAlertAreaHa: areaHa,
});

// What GET /api/dashboards/:id sends, parsed the way the page parses it, with
// `alertsCharts` charts computed from integrated alerts.
const dashboard = (id: string, alertsCharts = 2) =>
  DashboardResponseSchema.parse({
    id,
    user_id: "u1",
    name: "Bolivia Alert Overlay Analysis",
    is_public: false,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    widgets: [
      {
        id: "w1",
        position: 0,
        widget_type: "insight",
        created_at: "2026-10-01T00:00:00Z",
        insight: {
          id: "i1",
          charts: Array.from({ length: alertsCharts }, (_, i) => ({
            id: `c${i}`,
            chart_data: null,
            dataset_id: INTEGRATED_ALERTS_DATASET_ID,
          })),
        },
      },
    ],
  });

const renderStrip = (target = dashboard("d1")) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <WeeklyAlertsStrip dashboard={target} />
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe("WeeklyAlertsStrip", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(fetchDashboardAlertsSummary).mockReset();
  });

  it("announces the week's alert area and how many charts can be updated", async () => {
    vi.mocked(fetchDashboardAlertsSummary).mockResolvedValue(
      summaryWith({ d1: 1457.83 })
    );

    renderStrip();

    expect(
      await screen.findByText("1,458 ha of new integrated alerts this week")
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "· 2 charts can be updated. Ask the assistant to update a chart"
    );
    expect(fetchDashboardAlertsSummary).toHaveBeenCalledWith(["d1"]);
  });

  it("drops the chart count when no chart carries the dataset id", async () => {
    vi.mocked(fetchDashboardAlertsSummary).mockResolvedValue(
      summaryWith({ d1: 12 })
    );

    renderStrip(dashboard("d1", 0));

    await screen.findByText("12 ha of new integrated alerts this week");
    expect(screen.getByRole("status").textContent).toContain(
      "· Charts can be updated. Ask the assistant to update a chart"
    );
  });

  it("renders nothing for a dashboard without alerts this week", async () => {
    vi.mocked(fetchDashboardAlertsSummary).mockResolvedValue(summaryWith({}));

    const { container } = renderStrip();

    await waitFor(() =>
      expect(fetchDashboardAlertsSummary).toHaveBeenCalledTimes(1)
    );
    expect(container.textContent).toBe("");
  });

  it("stays dismissed for the week across remounts, in this browser", async () => {
    vi.mocked(fetchDashboardAlertsSummary).mockResolvedValue(
      summaryWith({ d1: 12 })
    );

    const first = renderStrip();
    await screen.findByText("12 ha of new integrated alerts this week");
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss alerts notice" })
    );
    expect(screen.queryByRole("status")).toBeNull();
    first.unmount();

    const second = renderStrip();
    await waitFor(() =>
      expect(fetchDashboardAlertsSummary).toHaveBeenCalledTimes(2)
    );
    expect(second.container.textContent).toBe("");
    expect(localStorage.getItem("gnw_dashboard_alerts_dismissed:d1")).toBe(
      "2026-10-11"
    );
  });

  it("returns once a new alert week arrives", async () => {
    localStorage.setItem("gnw_dashboard_alerts_dismissed:d1", "2026-10-04");
    vi.mocked(fetchDashboardAlertsSummary).mockResolvedValue(
      summaryWith({ d1: 12 })
    );

    renderStrip();

    expect(
      await screen.findByText("12 ha of new integrated alerts this week")
    ).toBeTruthy();
  });
});
