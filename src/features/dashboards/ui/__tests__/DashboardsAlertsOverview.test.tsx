// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AlertsSummary } from "../../lib/alerts-summary";
import DashboardsAlertsOverview from "../DashboardsAlertsOverview";

const summary: AlertsSummary = {
  startDate: "2026-10-05",
  endDate: "2026-10-11",
  assessedCount: 3,
  newAlertAreaHa: { a: 1457.83, c: 9 },
};

const checkedAt = Date.UTC(2026, 9, 9, 14, 0);

const renderOverview = (
  props: Partial<Parameters<typeof DashboardsAlertsOverview>[0]> = {}
) =>
  render(
    <ChakraProvider value={defaultSystem}>
      <DashboardsAlertsOverview
        summary={summary}
        dashboardIds={["a", "b", "c", "d"]}
        checkedAt={checkedAt}
        {...props}
      />
    </ChakraProvider>
  );

describe("DashboardsAlertsOverview", () => {
  it("counts the dashboards with new alerts against all on the page", () => {
    renderOverview();

    expect(
      screen.getByText(
        "2 of 4 dashboards have new alerts for the week of Oct 5–11"
      )
    ).toBeTruthy();
    expect(
      screen.getByText("Integrated alerts checked Oct 9, 2026 · 14:00 UTC")
    ).toBeTruthy();
  });

  it("uses the singular for a single dashboard", () => {
    renderOverview({ dashboardIds: ["a"] });

    expect(
      screen.getByText(
        "1 of 1 dashboard has new alerts for the week of Oct 5–11"
      )
    ).toBeTruthy();
  });

  it("leaves out the checked time while the summary is held over", () => {
    renderOverview({ checkedAt: undefined });

    expect(
      screen.getByText(
        "2 of 4 dashboards have new alerts for the week of Oct 5–11"
      )
    ).toBeTruthy();
    expect(screen.queryByText(/Integrated alerts checked/)).toBeNull();
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
