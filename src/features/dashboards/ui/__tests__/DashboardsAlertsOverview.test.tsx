// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AlertsFreshness, AlertsSummary } from "../../lib/alerts-summary";
import DashboardsAlertsOverview from "../DashboardsAlertsOverview";

const summary: AlertsSummary = {
  startDate: "2026-10-05",
  endDate: "2026-10-11",
  assessedCount: 3,
  newAlertAreaHa: { a: 1457.83, c: 9 },
};

const freshness: AlertsFreshness = {
  latestAlertDate: "2026-10-09",
  updatedOn: "2026-10-11",
};

const renderOverview = (
  props: Partial<Parameters<typeof DashboardsAlertsOverview>[0]> = {}
) =>
  render(
    <ChakraProvider value={defaultSystem}>
      <DashboardsAlertsOverview
        summary={summary}
        dashboardIds={["a", "b", "c", "d"]}
        freshness={freshness}
        {...props}
      />
    </ChakraProvider>
  );

describe("DashboardsAlertsOverview", () => {
  it("counts the dashboards with new alerts against all on the page", () => {
    renderOverview();

    expect(
      screen.getByText("2 of 4 dashboards have new alerts detected Oct 5–11")
    ).toBeTruthy();
    expect(
      screen.getByText("Latest alert detected Oct 9, 2026 · updated Oct 11")
    ).toBeTruthy();
  });

  it("uses the singular for a single dashboard", () => {
    renderOverview({ dashboardIds: ["a"] });

    expect(
      screen.getByText("1 of 1 dashboard has new alerts detected Oct 5–11")
    ).toBeTruthy();
  });

  it("shows the count without dates while they load or when they failed", () => {
    renderOverview({ freshness: undefined });

    expect(
      screen.getByText("2 of 4 dashboards have new alerts detected Oct 5–11")
    ).toBeTruthy();
    expect(screen.queryByText(/Latest alert detected/)).toBeNull();
  });

  it("says none were detected yet when the period starts after the latest detection", () => {
    renderOverview({
      summary: { ...summary, newAlertAreaHa: {} },
      freshness: { latestAlertDate: "2026-10-04", updatedOn: "2026-10-06" },
    });

    expect(screen.getByText("No alerts detected Oct 5–11 yet")).toBeTruthy();
    expect(screen.queryByText(/dashboards have new alerts/)).toBeNull();
    expect(
      screen.getByText("Latest alert detected Oct 4, 2026 · updated Oct 6")
    ).toBeTruthy();
  });

  it("holds its height, silently, while the summary loads", () => {
    const { container } = renderOverview({ summary: undefined });

    expect(container.textContent).toBe("");
    expect(container.firstElementChild).not.toBeNull();
  });

  it("stays silent when no dashboard could be assessed", () => {
    const { container } = renderOverview({
      summary: { ...summary, assessedCount: 0, newAlertAreaHa: {} },
    });

    expect(container.textContent).toBe("");
    expect(container.firstElementChild).not.toBeNull();
  });
});
