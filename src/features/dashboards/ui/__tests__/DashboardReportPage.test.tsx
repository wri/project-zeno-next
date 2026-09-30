// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The grid's print rendering is covered by the grid's own tests; here it only
// has to be asked for.
vi.mock("../DashboardWidgetsGrid", () => ({
  default: ({ print }: { print?: boolean }) => (
    <div data-testid="widgets-grid" data-print={String(!!print)} />
  ),
}));
vi.mock("@/app/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useParams: () => ({ id: "d1" }),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import DashboardReportPage from "../DashboardReportPage";
import { dashboardKeys } from "../dashboardQueries";
import type { Dashboard } from "../../api/schemas";

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Ucayali Forest Monitor",
  description: null,
  is_public: false,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T12:00:00Z",
  aois: [
    {
      source: "gadm",
      src_id: "PER.25_1",
      subtype: "state-province",
      name: "Ucayali",
      id: "a1",
      position: 0,
    },
  ],
  sections: [],
  widgets: [
    {
      id: "t1",
      position: 0,
      widget_type: "text",
      insight_id: null,
      section_id: null,
      config: { text: "A note" },
      created_at: "2026-07-01T00:00:00Z",
      insight: null,
    },
  ],
};

const renderPage = (data: Dashboard = dashboard) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(dashboardKeys.detail("d1"), data);
  return render(
    <ChakraProvider value={defaultSystem}>
      <QueryClientProvider client={queryClient}>
        <DashboardReportPage />
      </QueryClientProvider>
    </ChakraProvider>
  );
};

describe("DashboardReportPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("heads the document with the name, a calendar date and the area", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Ucayali Forest Monitor" })
    ).toBeTruthy();
    expect(screen.getByText("Updated 1 July 2026")).toBeTruthy();
    expect(screen.getByText("Area of interest: Ucayali")).toBeTruthy();
  });

  it("renders the widgets in the grid's print variant", () => {
    renderPage();

    expect(screen.getByTestId("widgets-grid").dataset.print).toBe("true");
  });

  it("says so when there is nothing to export", () => {
    renderPage({ ...dashboard, widgets: [] });

    expect(screen.queryByTestId("widgets-grid")).toBeNull();
    expect(
      screen.getByText("This dashboard has no widgets to export.")
    ).toBeTruthy();
  });

  it("saves as PDF through the browser's print dialog", () => {
    // happy-dom has no print dialog to spy on.
    const print = vi.fn();
    vi.stubGlobal("print", print);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /save as pdf/i }));

    expect(print).toHaveBeenCalledTimes(1);
  });

  it("links back to the interactive dashboard", () => {
    renderPage();

    expect(
      screen.getByText("Back to dashboard").closest("a")?.getAttribute("href")
    ).toBe("/dashboards/d1");
  });

  it("titles the document after the dashboard, for the PDF's file name", () => {
    document.title = "Global Nature Watch";
    const { unmount } = renderPage();

    expect(document.title).toBe("Ucayali Forest Monitor");
    unmount();
    expect(document.title).toBe("Global Nature Watch");
  });
});
