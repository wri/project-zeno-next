// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Export/Share are false doors surfaced through the Chakra toaster; stub it so
// the click behaviour is observable without the app-level toaster mount.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// The breadcrumb renders a router Link; outside a router it needs a stand-in.
vi.mock("@/app/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { toaster } from "@/app/components/ui/toaster";
import DashboardPinnedHeader from "../DashboardPinnedHeader";
import type { Dashboard } from "../../api/schemas";

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Paraná, Brazil",
  description: null,
  is_public: false,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  aois: [],
  widgets: [],
};

const renderPinned = (ui: ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <ChakraProvider value={defaultSystem}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </ChakraProvider>
  );
};

describe("DashboardPinnedHeader", () => {
  beforeEach(() => {
    vi.mocked(toaster.create).mockClear();
  });

  it("retains the title, breadcrumb, and Export/Share actions", () => {
    renderPinned(
      <DashboardPinnedHeader
        dashboard={dashboard}
        isOwner={false}
        pinned
        contentLeftPx={0}
      />
    );

    expect(screen.getAllByText("Paraná, Brazil").length).toBeGreaterThan(0);
    expect(screen.getByText("Dashboards").closest("a")).toHaveProperty(
      "href",
      expect.stringContaining("/dashboards")
    );
    expect(screen.getByRole("button", { name: /export/i })).toBeInstanceOf(
      HTMLElement
    );
    expect(screen.getByRole("button", { name: /share/i })).toBeInstanceOf(
      HTMLElement
    );
  });

  it("Export and Share behave identically to the full header (false-door toast)", () => {
    renderPinned(
      <DashboardPinnedHeader
        dashboard={dashboard}
        isOwner={false}
        pinned
        contentLeftPx={0}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    expect(toaster.create).toHaveBeenCalledTimes(2);
    expect(vi.mocked(toaster.create).mock.calls[0][0]).toMatchObject({
      title: "Coming soon",
    });
  });

  it("is hidden from assistive tech and pointer events when not pinned", () => {
    const { container } = renderPinned(
      <DashboardPinnedHeader
        dashboard={dashboard}
        isOwner={false}
        pinned={false}
        contentLeftPx={0}
      />
    );

    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
  });

  it("shows the rename affordance only for the owner", () => {
    renderPinned(
      <DashboardPinnedHeader
        dashboard={dashboard}
        isOwner
        pinned
        contentLeftPx={0}
      />
    );

    expect(
      screen.getByRole("button", { name: /rename dashboard/i })
    ).toBeInstanceOf(HTMLElement);
  });
});
