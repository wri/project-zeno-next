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

vi.mock("@/src/features/dashboards/api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDashboard: vi.fn(() => new Promise(() => {})),
  addInsightWidget: vi.fn().mockResolvedValue(undefined),
  deleteWidget: vi.fn().mockResolvedValue(undefined),
}));

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
import type { Dashboard } from "@/src/features/dashboards/api/schemas";
import type { CurrentDashboardArea } from "@/src/features/dashboards/ui/useCurrentDashboardArea";
import { usePendingInsightWidgetsStore } from "@/src/features/dashboards/model/pending-insight-widgets-store";
import {
  AnalysisJobFailedError,
  type AnalysisResult,
  type AnalysisService,
} from "@/src/features/analysis";
import type { Chart } from "@/src/entities/insight";
import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";

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
const TCL_TITLE = "Tree cover loss in Pará";

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

function renderList(service: AnalysisService) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(dashboardKeys.detail(dashboard.id), dashboard);
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

function switchFor(ariaLabel: string): HTMLInputElement {
  const root = screen.getByLabelText(ariaLabel);
  return within(root).getByRole("checkbox") as HTMLInputElement;
}

const pendingEntries = () => usePendingInsightWidgetsStore.getState().entries;

describe("CuratedInsightsList pending dashboard module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePendingInsightWidgetsStore.getState().reset();
    useAuthStore.setState({ userId: "u1" });
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d1" });
  });

  it("writes the pending entry the moment the toggle flips, and clears it once the add settles", async () => {
    const d = deferred<AnalysisResult>();
    const service = fakeService(() => d.promise);
    // Let the add's detail refetch resolve so the mutation settles.
    vi.mocked(getDashboard).mockResolvedValueOnce(dashboard);
    // The persisted insight id must be on the entry by the time the add POSTs.
    vi.mocked(addInsightWidget).mockImplementationOnce(async () => {
      expect(pendingEntries()[0]?.insightId).toBe("ins-1");
    });
    renderList(service);

    fireEvent.click(switchFor(`Add ${TCL_TITLE} to dashboard`));

    // The switch's change callback lands a tick after the click; the entry
    // must exist before the run resolves (the service promise is still open).
    await waitFor(() => expect(pendingEntries()).toHaveLength(1));
    expect(pendingEntries()[0]).toMatchObject({
      key: "d1:4",
      dashboardId: "d1",
      datasetId: 4,
      title: TCL_TITLE,
      datasetName: "Tree cover loss",
      chartCountHint: 2,
    });
    expect(pendingEntries()[0].insightId).toBeUndefined();

    d.resolve(RESULT);

    await waitFor(() =>
      expect(addInsightWidget).toHaveBeenCalledWith("d1", "ins-1", undefined)
    );
    await waitFor(() => expect(pendingEntries()).toEqual([]));
    expect(toaster.create).not.toHaveBeenCalled();
  });

  it("clears the pending entry when the job fails", async () => {
    const service = fakeService(() =>
      Promise.reject(new AnalysisJobFailedError("job-1"))
    );
    renderList(service);

    fireEvent.click(switchFor(`Add ${TCL_TITLE} to dashboard`));

    expect(
      await screen.findByText("Not available for this area right now")
    ).toBeTruthy();
    await waitFor(() => expect(pendingEntries()).toEqual([]));
    expect(addInsightWidget).not.toHaveBeenCalled();
  });

  it("clears the pending entry when the run yields no charts", async () => {
    const service = fakeService(() =>
      Promise.resolve({ id: "ins-empty", charts: [] })
    );
    renderList(service);

    fireEvent.click(switchFor(`Add ${TCL_TITLE} to dashboard`));

    expect(await screen.findByText("No data for this area")).toBeTruthy();
    await waitFor(() => expect(pendingEntries()).toEqual([]));
    expect(addInsightWidget).not.toHaveBeenCalled();
  });

  it("toggling off while running removes the entry and never adds, but keeps the result", async () => {
    const d = deferred<AnalysisResult>();
    const service = fakeService(() => d.promise);
    renderList(service);

    fireEvent.click(switchFor(`Add ${TCL_TITLE} to dashboard`));
    await waitFor(() => expect(pendingEntries()).toHaveLength(1));

    fireEvent.click(
      within(
        await screen.findByLabelText(`Cancel adding ${TCL_TITLE} to dashboard`)
      ).getByRole("checkbox")
    );
    await waitFor(() => expect(pendingEntries()).toEqual([]));
    // Back to a plain, enabled "Add" while the run carries on.
    await waitFor(() =>
      expect(switchFor(`Add ${TCL_TITLE} to dashboard`).disabled).toBe(false)
    );

    d.resolve(RESULT);

    // The run completes into the cache; nothing is added.
    await waitFor(() =>
      expect(screen.queryByText("Running analysis...")).toBeNull()
    );
    expect(addInsightWidget).not.toHaveBeenCalled();
    expect(pendingEntries()).toEqual([]);
    expect(service.run).toHaveBeenCalledTimes(1);
  });

  it("clears the pending entry on a 409 (already on the dashboard)", async () => {
    const service = fakeService(() => Promise.resolve(RESULT));
    vi.mocked(addInsightWidget).mockRejectedValueOnce(
      Object.assign(new Error("Conflict"), { status: 409 })
    );
    vi.mocked(getDashboard).mockResolvedValueOnce(dashboard);
    renderList(service);

    fireEvent.click(switchFor(`Add ${TCL_TITLE} to dashboard`));

    await waitFor(() =>
      expect(addInsightWidget).toHaveBeenCalledWith("d1", "ins-1", undefined)
    );
    await waitFor(() => expect(pendingEntries()).toEqual([]));
    expect(toaster.create).not.toHaveBeenCalled();
  });

  it("does not write a pending entry when a card is merely viewed", async () => {
    const service = fakeService(() => Promise.resolve(RESULT));
    renderList(service);

    fireEvent.click(
      screen.getByRole("button", { name: `Show ${TCL_TITLE} info` })
    );

    expect(await screen.findByTestId("widget-message")).toBeTruthy();
    expect(pendingEntries()).toEqual([]);
  });
});
