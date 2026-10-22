// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Dashboard } from "../../api/schemas";
import DashboardCard from "../DashboardCard";

vi.mock("@/src/shared/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: ({ href, ...rest }: { href: string } & React.ComponentProps<"a">) => (
    <a href={href} {...rest} />
  ),
}));
vi.mock("../DashboardActionsMenu", () => ({ default: () => null }));

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Paraná forest watch",
  is_public: false,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-20T00:00:00Z",
  aois: [],
  sections: [],
  widgets: [],
};

const renderCard = (alertsLoading: boolean, hasNewAlerts: boolean) =>
  render(
    <ChakraProvider value={defaultSystem}>
      <DashboardCard
        dashboard={dashboard}
        alertsLoading={alertsLoading}
        hasNewAlerts={hasNewAlerts}
      />
    </ChakraProvider>
  );

describe("DashboardCard alerts badge", () => {
  it("shimmers in the badge slot while the summary loads", () => {
    const { container } = renderCard(true, false);

    expect(container.querySelector(".chakra-skeleton")).not.toBeNull();
  });

  it("shows the badge once the summary has alerts for the area", () => {
    const { container } = renderCard(false, true);

    expect(screen.getByText("New alerts")).toBeTruthy();
    expect(container.querySelector(".chakra-skeleton")).toBeNull();
  });

  it("leaves the slot empty once the summary has none", () => {
    const { container } = renderCard(false, false);

    expect(screen.queryByText("New alerts")).toBeNull();
    expect(container.querySelector(".chakra-skeleton")).toBeNull();
  });
});
