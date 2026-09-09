// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// Keep the dashboard detail off the network (the cache is seeded) and spy on
// the widget add/remove calls.
vi.mock("@/src/features/dashboards/api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDashboard: vi.fn(() => new Promise(() => {})),
  addInsightWidget: vi.fn().mockResolvedValue(undefined),
  deleteWidget: vi.fn().mockResolvedValue(undefined),
}));

// The chart body is WidgetMessage's contract; stub it to a marker so these
// tests assert the pane's structure without mounting a chart library.
vi.mock("@/app/components/WidgetMessage", () => ({
  default: ({ widget }: { widget: { title: string } }) => (
    <div data-testid="widget-message">{widget.title}</div>
  ),
}));

import {
  addInsightWidget,
  getDashboard,
} from "@/src/features/dashboards/api/dashboards";
import { toaster } from "@/app/components/ui/toaster";
import { dashboardKeys } from "@/src/features/dashboards/ui/dashboardQueries";
import type {
  Dashboard,
  DashboardWidget,
} from "@/src/features/dashboards/api/schemas";
import type { CurrentDashboardArea } from "@/src/features/dashboards/ui/useCurrentDashboardArea";
import {
  AnalysisJobFailedError,
  type AnalysisResult,
  type AnalysisService,
} from "@/src/features/analysis";
import type { Chart } from "@/src/entities/insight";
import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";
import { usePendingInsightWidgetsStore } from "@/src/features/dashboards/model/pending-insight-widgets-store";

import { CuratedInsightsList } from "../curated-insights-list";

const area: CurrentDashboardArea = {
  aoiSource: "gadm",
  aoiId: "BRA.14_1",
  subtype: "state-province",
  name: "Pará",
};

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Pará forest watch",
  description: null,
  is_public: false,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  aois: [
    {
      id: "a1",
      position: 0,
      source: "gadm",
      src_id: "BRA.14_1",
      subtype: "state-province",
      name: "Pará",
    },
  ],
  sections: [],
  widgets: [],
};

const curatedTclWidget: DashboardWidget = {
  id: "w-tcl",
  position: 0,
  widget_type: "insight",
  insight_id: "ins-existing",
  config: {},
  created_at: "2026-07-01T00:00:00Z",
  insight: {
    id: "ins-existing",
    insight_text: "",
    codeact_parts: [],
    charts: [
      {
        id: "c-x",
        position: 0,
        title: "Annual tree cover loss",
        chart_type: "bar",
        x_axis: "year",
        y_axis: "loss_ha",
        series_fields: null,
        chart_data: [],
        dataset_id: 4,
      },
    ],
  },
};

const chart: Chart = {
  id: "c-1",
  position: 0,
  title: "Annual tree cover loss",
  type: "bar",
  xAxis: "year",
  yAxis: "loss_ha",
  colorField: "",
  stackField: "",
  groupField: "",
  seriesFields: [],
  data: [{ year: 2020, loss_ha: 5 }],
};

const RESULT: AnalysisResult = { id: "ins-1", charts: [chart] };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakeService(impl: AnalysisService["run"]): AnalysisService {
  return { run: vi.fn(impl) };
}

function renderList(service: AnalysisService, seed: Dashboard = dashboard) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(dashboardKeys.detail(seed.id), seed);
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
      </QueryClientProvider>
    );
  }
  return render(<CuratedInsightsList area={area} service={service} />, {
    wrapper: Wrapper,
  });
}

const TCL_TITLE = "Tree cover loss in Pará";

/** The card's footer switch: the Switch.Root label carries the aria-label. */
function switchFor(ariaLabel: string): HTMLInputElement {
  const root = screen.getByLabelText(ariaLabel);
  return within(root).getByRole("checkbox") as HTMLInputElement;
}

/**
 * The switch's controlled on/off state, read from Zag's `data-state` on the
 * root. The hidden input's native `checked` is not reliable here: happy-dom's
 * click activation toggles it after dispatch, outside React's controlled
 * restore, so it can read true while the component holds false.
 */
function switchState(ariaLabel: string): string | null {
  return screen.getByLabelText(ariaLabel).getAttribute("data-state");
}

describe("CuratedInsightsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePendingInsightWidgetsStore.getState().reset();
    useAuthStore.setState({ userId: "u1" });
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d1" });
  });

  it("lists one curated card per catalogue dataset, titled for the dashboard's area", () => {
    const service = fakeService(() => Promise.resolve(RESULT));
    renderList(service);

    expect(screen.getAllByText("CURATED")).toHaveLength(10);
    expect(screen.getByText(TCL_TITLE)).toBeTruthy();
    expect(screen.getByText("Integrated alerts in Pará")).toBeTruthy();
    expect(
      screen.getByText("Annual tree cover loss and the GHG emissions it caused")
    ).toBeTruthy();
    expect(screen.getAllByText("Add to dashboard")).toHaveLength(10);
    // Nothing runs eagerly.
    expect(service.run).not.toHaveBeenCalled();
  });

  it("toggling an un-run card runs the analysis, then adds the persisted insight", async () => {
    const d = deferred<AnalysisResult>();
    const service = fakeService(() => d.promise);
    renderList(service);

    fireEvent.click(switchFor(`Add ${TCL_TITLE} to dashboard`));

    await waitFor(() => expect(service.run).toHaveBeenCalledTimes(1));
    expect(service.run).toHaveBeenCalledWith(
      expect.objectContaining({
        area: {
          name: "Pará",
          source: "gadm",
          srcId: "BRA.14_1",
          subtype: "state-province",
        },
        dataset: { id: 4, name: "Tree cover loss" },
        startDate: "2001-01-01",
        endDate: "2025-12-31",
      })
    );
    // Running state spans the run and the add: the switch reads on (it mirrors
    // the pending module on the grid) and can be flipped back off.
    expect(screen.getByText("Running...")).toBeTruthy();
    expect(screen.getByText("Running analysis...")).toBeTruthy();
    expect(switchState(`Cancel adding ${TCL_TITLE} to dashboard`)).toBe(
      "checked"
    );
    expect(switchFor(`Cancel adding ${TCL_TITLE} to dashboard`).disabled).toBe(
      false
    );
    expect(addInsightWidget).not.toHaveBeenCalled();

    d.resolve(RESULT);

    await waitFor(() =>
      expect(addInsightWidget).toHaveBeenCalledWith("d1", "ins-1", undefined)
    );
  });

  it("shows a failed job as unavailable with Try again, leaves the toggle off and adds nothing", async () => {
    const service = fakeService(() =>
      Promise.reject(new AnalysisJobFailedError("job-1"))
    );
    renderList(service);

    fireEvent.click(switchFor(`Add ${TCL_TITLE} to dashboard`));

    expect(
      await screen.findByText("Not available for this area right now")
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: `Try ${TCL_TITLE} again` })
    ).toBeTruthy();
    // The adding flag clears once the failed run settles: the card is not
    // stuck in "Running..." and the toggle is usable again, still off.
    await waitFor(() => expect(screen.queryByText("Running...")).toBeNull());
    expect(switchState(`Add ${TCL_TITLE} to dashboard`)).toBe("unchecked");
    expect(switchFor(`Add ${TCL_TITLE} to dashboard`).disabled).toBe(false);
    expect(addInsightWidget).not.toHaveBeenCalled();
  });

  it("shows a completed job with no charts as no data and adds nothing", async () => {
    const service = fakeService(() =>
      Promise.resolve({ id: "ins-empty", charts: [] })
    );
    renderList(service);

    fireEvent.click(switchFor(`Add ${TCL_TITLE} to dashboard`));

    expect(await screen.findByText("No data for this area")).toBeTruthy();
    expect(screen.queryByText("Running...")).toBeNull();
    expect(switchFor(`Add ${TCL_TITLE} to dashboard`).disabled).toBe(true);
    expect(addInsightWidget).not.toHaveBeenCalled();
  });

  it("shows a transport error with Try again, and a retry re-runs to ready", async () => {
    const service = fakeService(
      vi
        .fn<AnalysisService["run"]>()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce(RESULT)
    );
    renderList(service);

    fireEvent.click(
      screen.getByRole("button", { name: `Show ${TCL_TITLE} info` })
    );
    // Detail view while the first run fails.
    expect(await screen.findByText("Couldn't run this analysis")).toBeTruthy();
    expect(screen.queryByTestId("widget-message")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByTestId("widget-message")).toBeTruthy();
    expect(screen.getByText("Annual tree cover loss")).toBeTruthy();
    expect(service.run).toHaveBeenCalledTimes(2);
  });

  it("reads On dashboard for a curated widget already on the dashboard, without running", () => {
    const service = fakeService(() => Promise.resolve(RESULT));
    renderList(service, { ...dashboard, widgets: [curatedTclWidget] });

    expect(switchState(`Remove ${TCL_TITLE} from dashboard`)).toBe("checked");
    expect(screen.getByText("On dashboard")).toBeTruthy();
    expect(screen.getAllByText("Add to dashboard")).toHaveLength(9);
    expect(service.run).not.toHaveBeenCalled();
  });

  it("treats a 409 on add as already present: no error toast", async () => {
    const service = fakeService(() => Promise.resolve(RESULT));
    vi.mocked(addInsightWidget).mockRejectedValueOnce(
      Object.assign(new Error("Conflict"), { status: 409 })
    );
    vi.mocked(getDashboard).mockResolvedValueOnce({
      ...dashboard,
      widgets: [{ ...curatedTclWidget, insight_id: "ins-1" }],
    });
    renderList(service);

    fireEvent.click(switchFor(`Add ${TCL_TITLE} to dashboard`));

    await waitFor(() =>
      expect(addInsightWidget).toHaveBeenCalledWith("d1", "ins-1", undefined)
    );
    await waitFor(() => expect(screen.queryByText("Running...")).toBeNull());
    expect(toaster.create).not.toHaveBeenCalled();
  });

  it("lets a non-owner view an analysis but not add it", async () => {
    useAuthStore.setState({ userId: "visitor" });
    const service = fakeService(() => Promise.resolve(RESULT));
    renderList(service);

    expect(switchFor(`Add ${TCL_TITLE} to dashboard`).disabled).toBe(true);

    fireEvent.click(
      screen.getByRole("button", { name: `Show ${TCL_TITLE} info` })
    );

    expect(await screen.findByTestId("widget-message")).toBeTruthy();
    expect(service.run).toHaveBeenCalledTimes(1);
    expect(addInsightWidget).not.toHaveBeenCalled();
  });

  it("never opens the chart pager for a run with no charts", async () => {
    const service = fakeService(() =>
      Promise.resolve({ id: "ins-empty", charts: [] })
    );
    renderList(service);

    fireEvent.click(
      screen.getByRole("button", { name: `Show ${TCL_TITLE} info` })
    );

    expect(await screen.findByText("No data for this area")).toBeTruthy();
    expect(screen.queryByTestId("widget-message")).toBeNull();
    // The quiet retry is still there, and Back returns to the cards.
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Back to analyses/ }));
    expect(screen.getAllByText("CURATED")).toHaveLength(10);
  });
});
