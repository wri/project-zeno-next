// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Heavy page collaborators that are irrelevant to the header behaviour.
vi.mock("@/app/ChatPanel", () => ({ default: () => null }));
vi.mock("../DashboardWidgetsGrid", () => ({ default: () => null }));
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "d1" }),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));
vi.mock("../../api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDashboard: vi.fn(async () => dashboard),
}));

import DashboardDetailPage from "../DashboardDetailPage";
import { dashboardKeys } from "../dashboardQueries";
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

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: ObserverCallback;

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(dashboardKeys.detail("d1"), dashboard);
  return render(
    <ChakraProvider value={defaultSystem}>
      <QueryClientProvider client={queryClient}>
        <DashboardDetailPage />
      </QueryClientProvider>
    </ChakraProvider>
  );
};

const setPinned = (pinned: boolean) =>
  act(() =>
    MockIntersectionObserver.instances.at(-1)!.callback([
      {
        isIntersecting: !pinned,
        boundingClientRect: { top: pinned ? -60 : 100 } as DOMRectReadOnly,
      },
    ])
  );

describe("DashboardDetailPage adaptive header accessibility", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  it("exposes exactly one live copy of the header controls at a time", () => {
    const { container } = renderPage();

    // At the top of the page only the pinned overlay is hidden.
    let hidden = container.querySelectorAll('[aria-hidden="true"]');
    expect(hidden).toHaveLength(1);
    expect(container.querySelectorAll("[inert]")).toHaveLength(0);

    // Pinned: the overlay goes live; the scrolled-away breadcrumb and
    // in-page header leave the accessibility tree and tab order instead.
    setPinned(true);
    hidden = container.querySelectorAll('[aria-hidden="true"]');
    expect(hidden).toHaveLength(2);
    expect(container.querySelectorAll("[inert]")).toHaveLength(2);

    // Every control name still resolves to a single live (non-hidden) copy.
    for (const label of ["Export", "Share"]) {
      const all = Array.from(container.querySelectorAll("button")).filter((b) =>
        b.textContent?.includes(label)
      );
      expect(all).toHaveLength(2);
      const live = all.filter((b) => !b.closest('[aria-hidden="true"]'));
      expect(live).toHaveLength(1);
    }

    // Back at the top the originals are live again.
    setPinned(false);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
    expect(container.querySelectorAll("[inert]")).toHaveLength(0);
  });
});
