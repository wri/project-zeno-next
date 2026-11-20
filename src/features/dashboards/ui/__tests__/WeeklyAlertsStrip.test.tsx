// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/dashboards", () => ({
  fetchDashboardAlertsSummary: vi.fn(),
  listAnalysisTemplates: vi.fn(),
  applyAnalysisTemplate: vi.fn(),
  getDashboard: vi.fn(),
}));

vi.mock("../../api/analytics", () => ({
  fetchIntegratedAlertsFreshness: vi.fn(),
}));

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
}));

// Scrolling is DOM glue (covered in scrollToSection.test); the strip's part
// is asking for the right widget.
vi.mock("../scrollToSection", () => ({
  scrollToWidgetWhenRendered: vi.fn(),
  scrollToSectionWhenRendered: vi.fn(),
}));

import { toaster } from "@/app/components/ui/toaster";
import { fetchIntegratedAlertsFreshness } from "../../api/analytics";
import {
  applyAnalysisTemplate,
  fetchDashboardAlertsSummary,
  getDashboard,
  listAnalysisTemplates,
} from "../../api/dashboards";
import {
  DashboardResponseSchema,
  type AnalysisTemplate,
  type Dashboard,
  type SectionFromTemplateResponse,
} from "../../api/schemas";
import type { AlertsSummary } from "../../lib/alerts-summary";
import { dashboardKeys, useDashboard } from "../dashboardQueries";
import {
  scrollToSectionWhenRendered,
  scrollToWidgetWhenRendered,
} from "../scrollToSection";
import { useApplyAnalysisTemplate } from "../useApplyAnalysisTemplate";
import WeeklyAlertsStrip from "../WeeklyAlertsStrip";

const mockedSummary = vi.mocked(fetchDashboardAlertsSummary);
const mockedFreshness = vi.mocked(fetchIntegratedAlertsFreshness);
const mockedTemplates = vi.mocked(listAnalysisTemplates);
const mockedApply = vi.mocked(applyAnalysisTemplate);

const period = { startDate: "2026-11-07", endDate: "2026-11-13" };

const summaryWith = (areaHa: Record<string, number>): AlertsSummary => ({
  ...period,
  assessedCount: Object.keys(areaHa).length,
  newAlertAreaHa: areaHa,
});

const template = (name: string): AnalysisTemplate => ({
  name,
  label: name,
  args_schema: {},
  widgets: [],
});

const alertsWidget = (id: string, sectionId: string | null = null) => ({
  id,
  position: 0,
  widget_type: "alerts",
  section_id: sectionId,
  config: {},
  created_at: "2026-11-16T00:00:00Z",
});

// What GET /api/dashboards/:id sends, parsed the way the page parses it: an
// area and an integrated alerts chart (the summary covers only dashboards
// with one), plus any extra widgets and sections.
const dashboardWith = (
  extraWidgets: object[] = [],
  sections: object[] = []
): Dashboard =>
  DashboardResponseSchema.parse({
    id: "d1",
    user_id: "u1",
    name: "Bolivia Alert Overlay Analysis",
    is_public: false,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    aois: [
      {
        id: "a1",
        position: 0,
        source: "gadm",
        src_id: "BOL",
        subtype: "country",
        name: "Bolivia",
      },
    ],
    sections,
    widgets: [
      {
        id: "w-chart",
        position: 0,
        widget_type: "insight",
        created_at: "2026-10-01T00:00:00Z",
        insight: {
          id: "i1",
          charts: [{ id: "c1", chart_data: null, dataset_id: 11 }],
        },
      },
      ...extraWidgets,
    ],
  });

const section = (id: string, position: number) => ({
  id,
  title: `Section ${id}`,
  position,
  created_at: "2026-10-01T00:00:00Z",
});

/**
 * The strip as the page mounts it: the dashboard read from the detail cache,
 * so a template's response (written there) reaches the strip as it does on
 * the page.
 */
function StripOnPage({ isOwner }: { isOwner: boolean }) {
  const { data } = useDashboard("d1");
  return data ? <WeeklyAlertsStrip dashboard={data} isOwner={isOwner} /> : null;
}

/** Another surface applying a template, as the footer's cards do. */
function OtherTemplateCard() {
  const apply = useApplyAnalysisTemplate("d1");
  return (
    <button type="button" onClick={() => apply.mutate("post-2020-forest-loss")}>
      Other template
    </button>
  );
}

const renderStrip = (
  target: Dashboard = dashboardWith(),
  {
    isOwner = true,
    beside,
  }: { isOwner?: boolean; beside?: React.ReactNode } = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(dashboardKeys.detail("d1"), target);
  vi.mocked(getDashboard).mockResolvedValue(target);
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <StripOnPage isOwner={isOwner} />
        {beside}
      </ChakraProvider>
    </QueryClientProvider>
  );
};

const strip = () => screen.getByRole("status");

/** Lets the freshness and registry requests settle, whichever way they go. */
const settle = () => act(async () => {});

describe("WeeklyAlertsStrip", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockedSummary.mockResolvedValue(summaryWith({ d1: 142.3 }));
    mockedFreshness.mockResolvedValue({
      latestAlertDate: "2026-11-13",
      updatedOn: "2026-11-15",
    });
    mockedTemplates.mockResolvedValue([
      template("nrt-monitoring"),
      template("post-2020-forest-loss"),
    ]);
  });

  it("announces the period's alert area and when the data was updated", async () => {
    renderStrip();

    expect(
      await screen.findByText("142 ha of new integrated alerts, Nov 7–13")
    ).toBeTruthy();
    expect(await screen.findByText("· Data updated Nov 15")).toBeTruthy();
    expect(strip().textContent).not.toMatch(/can be updated|Ask the assistant/);
    expect(mockedSummary).toHaveBeenCalledWith(["d1"]);
  });

  it("leaves the data updated date out when it failed to load", async () => {
    mockedFreshness.mockRejectedValue(new Error("analytics API down"));
    renderStrip();

    await screen.findByText("142 ha of new integrated alerts, Nov 7–13");
    await waitFor(() => expect(mockedFreshness).toHaveBeenCalledTimes(1));
    await settle();
    expect(strip().textContent).not.toMatch(/Data updated/);
  });

  it("dates a release in the next year with its year", async () => {
    mockedSummary.mockResolvedValue({
      startDate: "2026-12-25",
      endDate: "2026-12-31",
      assessedCount: 1,
      newAlertAreaHa: { d1: 3.13 },
    });
    mockedFreshness.mockResolvedValue({
      latestAlertDate: "2026-12-31",
      updatedOn: "2027-01-02",
    });
    renderStrip();

    expect(
      await screen.findByText("3.1 ha of new integrated alerts, Dec 25–31")
    ).toBeTruthy();
    expect(await screen.findByText("· Data updated Jan 2, 2027")).toBeTruthy();
  });

  it("links to the first alerts list on screen, for a viewer too, without asking for templates", async () => {
    renderStrip(
      dashboardWith(
        [alertsWidget("w-in-s2", "s2"), alertsWidget("w-in-s1", "s1")],
        [section("s2", 1), section("s1", 0)]
      ),
      { isOwner: false }
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "View alerts list" })
    );
    expect(scrollToWidgetWhenRendered).toHaveBeenCalledWith("w-in-s1");
    expect(
      screen.queryByRole("button", { name: "Add alerts list" })
    ).toBeNull();
    expect(mockedTemplates).not.toHaveBeenCalled();
  });

  it("offers the owner of a dashboard without an alerts list the Near real-time monitoring template, then links to its list", async () => {
    let respond!: (response: SectionFromTemplateResponse) => void;
    mockedApply.mockReturnValue(
      new Promise((resolve) => {
        respond = resolve;
      })
    );
    renderStrip();

    const add = await screen.findByRole("button", { name: "Add alerts list" });
    fireEvent.click(add);
    const adding = await screen.findByRole("button", { name: "Adding…" });
    expect(mockedApply).toHaveBeenCalledWith("d1", "nrt-monitoring");
    expect((adding as HTMLButtonElement).disabled).toBe(true);

    await act(async () =>
      respond({
        section_id: "s-new",
        widget_ids: ["w-new"],
        warnings: [],
        dashboard: dashboardWith(
          [alertsWidget("w-new", "s-new")],
          [section("s-new", 0)]
        ),
      })
    );

    // The hook scrolls to the new section; the strip now links to its list.
    expect(scrollToSectionWhenRendered).toHaveBeenCalledWith("s-new");
    fireEvent.click(
      await screen.findByRole("button", { name: "View alerts list" })
    );
    expect(scrollToWidgetWhenRendered).toHaveBeenCalledWith("w-new");
    expect(screen.queryByRole("button", { name: "Adding…" })).toBeNull();
  });

  it("offers Add again, with the hook's error toast, when the template fails", async () => {
    mockedApply.mockRejectedValue(
      Object.assign(new Error("Bad gateway"), { status: 502 })
    );
    renderStrip();

    fireEvent.click(
      await screen.findByRole("button", { name: "Add alerts list" })
    );

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" })
      )
    );
    const add = await screen.findByRole("button", { name: "Add alerts list" });
    expect((add as HTMLButtonElement).disabled).toBe(false);
  });

  it("holds Add, under its own label, while another template applies", async () => {
    mockedApply.mockReturnValue(new Promise(() => {}));
    renderStrip(dashboardWith(), { beside: <OtherTemplateCard /> });
    await screen.findByRole("button", { name: "Add alerts list" });

    fireEvent.click(screen.getByRole("button", { name: "Other template" }));

    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Add alerts list",
          }) as HTMLButtonElement
        ).disabled
      ).toBe(true)
    );
    expect(screen.queryByRole("button", { name: "Adding…" })).toBeNull();
    expect(mockedApply).toHaveBeenCalledTimes(1);
  });

  it("offers nothing to a viewer of a dashboard without an alerts list", async () => {
    renderStrip(dashboardWith(), { isOwner: false });

    await screen.findByText("142 ha of new integrated alerts, Nov 7–13");
    await settle();
    expect(screen.queryByRole("button", { name: /alerts list/ })).toBeNull();
    expect(mockedTemplates).not.toHaveBeenCalled();
  });

  it("offers nothing while the registry loads", async () => {
    mockedTemplates.mockReturnValue(new Promise(() => {}));
    renderStrip();

    await screen.findByText("142 ha of new integrated alerts, Nov 7–13");
    await waitFor(() => expect(mockedTemplates).toHaveBeenCalledTimes(1));
    await settle();
    expect(screen.queryByRole("button", { name: /alerts list/ })).toBeNull();
  });

  it("offers nothing when the registry failed to load", async () => {
    mockedTemplates.mockRejectedValue(new Error("registry down"));
    renderStrip();

    await screen.findByText("142 ha of new integrated alerts, Nov 7–13");
    await waitFor(() => expect(mockedTemplates).toHaveBeenCalledTimes(1));
    await settle();
    expect(screen.queryByRole("button", { name: /alerts list/ })).toBeNull();
  });

  it("offers nothing when the registry does not list the template", async () => {
    mockedTemplates.mockResolvedValue([template("post-2020-forest-loss")]);
    renderStrip();

    await screen.findByText("142 ha of new integrated alerts, Nov 7–13");
    await waitFor(() => expect(mockedTemplates).toHaveBeenCalledTimes(1));
    await settle();
    expect(screen.queryByRole("button", { name: /alerts list/ })).toBeNull();
  });

  it("renders nothing, and asks for nothing more, for a dashboard without alerts", async () => {
    mockedSummary.mockResolvedValue(summaryWith({}));

    const { container } = renderStrip();

    await waitFor(() => expect(mockedSummary).toHaveBeenCalledTimes(1));
    await settle();
    expect(container.textContent).toBe("");
    expect(mockedFreshness).not.toHaveBeenCalled();
    expect(mockedTemplates).not.toHaveBeenCalled();
  });

  it("stays dismissed for the period across remounts, in this browser", async () => {
    const first = renderStrip();
    await screen.findByText("142 ha of new integrated alerts, Nov 7–13");
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss alerts notice" })
    );
    expect(screen.queryByRole("status")).toBeNull();
    first.unmount();

    const second = renderStrip();
    await waitFor(() => expect(mockedSummary).toHaveBeenCalledTimes(2));
    expect(second.container.textContent).toBe("");
    expect(localStorage.getItem("gnw_dashboard_alerts_dismissed:d1")).toBe(
      "2026-11-13"
    );
  });

  it("returns once a new period arrives", async () => {
    localStorage.setItem("gnw_dashboard_alerts_dismissed:d1", "2026-11-06");

    renderStrip();

    expect(
      await screen.findByText("142 ha of new integrated alerts, Nov 7–13")
    ).toBeTruthy();
  });
});
