// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The chatStore import chain reaches the Chakra toaster (.tsx) — stub it so the
// test environment can parse the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import DashboardEmptyStateHero from "../DashboardEmptyStateHero";
import type { Dashboard } from "../../api/schemas";

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Paraná, Brazil",
  description: null,
  is_public: false,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
  aois: [],
  sections: [],
  widgets: [],
};

const renderHero = (isOwner: boolean) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <DashboardEmptyStateHero dashboard={dashboard} isOwner={isOwner} />
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe("DashboardEmptyStateHero", () => {
  it("greets the owner and names the dashboard's area", () => {
    renderHero(true);

    expect(screen.getByText("Your dashboard is ready")).toBeTruthy();
    expect(
      screen.getByText((text) => text.includes("Paraná, Brazil"))
    ).toBeTruthy();
  });

  it("reuses the same suggested-modules row shown on a populated dashboard", () => {
    renderHero(true);

    expect(screen.getByText("Suggested modules")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Tree cover loss analysis" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Text block" })).toBeTruthy();
  });

  it("hides the owner-only 'Text block' card for a viewer", () => {
    renderHero(false);

    expect(screen.queryByRole("button", { name: "Text block" })).toBeNull();
  });
});
