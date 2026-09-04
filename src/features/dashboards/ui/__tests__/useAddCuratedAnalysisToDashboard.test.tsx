// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

vi.mock("../../api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDashboard: vi.fn(() => new Promise(() => {})),
  addInsightWidget: vi.fn().mockResolvedValue(undefined),
  deleteWidget: vi.fn().mockResolvedValue(undefined),
}));

import {
  addInsightWidget,
  deleteWidget,
  getDashboard,
} from "../../api/dashboards";
import { toaster } from "@/app/components/ui/toaster";
import { dashboardKeys } from "../dashboardQueries";
import {
  useAddCuratedAnalysisToDashboard,
  type AddCuratedAnalysisOutcome,
} from "../useAddCuratedAnalysisToDashboard";
import type { CurrentDashboardArea } from "../useCurrentDashboardArea";
import type { Dashboard, DashboardWidget } from "../../api/schemas";
import { usePendingInsightWidgetsStore } from "../../model/pending-insight-widgets-store";
import {
  AnalysisJobFailedError,
  type AnalysisResult,
  type AnalysisService,
  type CuratedAnalysisSpec,
} from "@/src/features/analysis";
import type { Chart } from "@/src/entities/insight";
import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";

const spec: CuratedAnalysisSpec = {
  datasetId: 4,
  datasetName: "Tree cover loss",
  description: "Annual tree cover loss and the GHG emissions it caused",
  chartCountHint: 2,
};

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

function makeWrapper(seed: Dashboard = dashboard) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(dashboardKeys.detail(seed.id), seed);
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const entries = () => usePendingInsightWidgetsStore.getState().entries;

describe("useAddCuratedAnalysisToDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePendingInsightWidgetsStore.getState().reset();
    useAuthStore.setState({ userId: "u1" });
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d1" });
  });

  it("starts idle: titled, not run, not added, addable by the owner", () => {
    const service = fakeService(() => Promise.resolve(RESULT));
    const { result } = renderHook(
      () => useAddCuratedAnalysisToDashboard(spec, area, service),
      { wrapper: makeWrapper() }
    );

    expect(result.current.title).toBe("Tree cover loss in Pará");
    expect(result.current.state).toBe("not-run");
    expect(result.current.added).toBe(false);
    expect(result.current.canAdd).toBe(true);
    expect(result.current.pending).toBe(false);
    expect(result.current.busy).toBe(false);
    expect(service.run).not.toHaveBeenCalled();
  });

  it("addNow registers the loading module, runs, attaches the id, adds, then clears", async () => {
    const d = deferred<AnalysisResult>();
    const service = fakeService(() => d.promise);
    vi.mocked(getDashboard).mockResolvedValueOnce(dashboard);
    vi.mocked(addInsightWidget).mockImplementationOnce(async () => {
      expect(entries()[0]?.insightId).toBe("ins-1");
    });
    const { result } = renderHook(
      () => useAddCuratedAnalysisToDashboard(spec, area, service),
      { wrapper: makeWrapper() }
    );

    let done: Promise<AddCuratedAnalysisOutcome>;
    act(() => {
      done = result.current.addNow();
    });

    await waitFor(() => expect(result.current.pending).toBe(true));
    expect(entries()[0]).toMatchObject({
      key: "d1:4",
      title: "Tree cover loss in Pará",
      datasetName: "Tree cover loss",
      chartCountHint: 2,
    });
    expect(result.current.busy).toBe(true);
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

    await act(async () => {
      d.resolve(RESULT);
      await done;
    });

    await expect(done!).resolves.toBe("added");
    expect(addInsightWidget).toHaveBeenCalledWith("d1", "ins-1", undefined);
    expect(entries()).toEqual([]);
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(toaster.create).not.toHaveBeenCalled();
  });

  it("cancel during the run drops the module and never adds", async () => {
    const d = deferred<AnalysisResult>();
    const service = fakeService(() => d.promise);
    const { result } = renderHook(
      () => useAddCuratedAnalysisToDashboard(spec, area, service),
      { wrapper: makeWrapper() }
    );

    let done: Promise<AddCuratedAnalysisOutcome>;
    act(() => {
      done = result.current.addNow();
    });
    await waitFor(() => expect(result.current.pending).toBe(true));

    act(() => result.current.cancel());
    expect(entries()).toEqual([]);

    await act(async () => {
      d.resolve(RESULT);
      await done;
    });

    await expect(done!).resolves.toBe("cancelled");
    expect(addInsightWidget).not.toHaveBeenCalled();
    // The run itself completed into the cache and stays usable.
    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(service.run).toHaveBeenCalledTimes(1);
  });

  it("a failed job clears the module and adds nothing", async () => {
    const service = fakeService(() =>
      Promise.reject(new AnalysisJobFailedError("job-1"))
    );
    const { result } = renderHook(
      () => useAddCuratedAnalysisToDashboard(spec, area, service),
      { wrapper: makeWrapper() }
    );

    let outcome = "";
    await act(async () => {
      outcome = await result.current.addNow();
    });

    expect(outcome).toBe("unavailable");
    await waitFor(() => expect(result.current.state).toBe("unavailable"));
    expect(entries()).toEqual([]);
    expect(addInsightWidget).not.toHaveBeenCalled();
  });

  it("a run with no charts clears the module and adds nothing", async () => {
    const service = fakeService(() =>
      Promise.resolve({ id: "ins-empty", charts: [] })
    );
    const { result } = renderHook(
      () => useAddCuratedAnalysisToDashboard(spec, area, service),
      { wrapper: makeWrapper() }
    );

    let outcome = "";
    await act(async () => {
      outcome = await result.current.addNow();
    });

    expect(outcome).toBe("no-data");
    await waitFor(() => expect(result.current.state).toBe("no-data"));
    expect(entries()).toEqual([]);
    expect(addInsightWidget).not.toHaveBeenCalled();
  });

  it("a transport failure reports error and clears the module", async () => {
    const service = fakeService(() => Promise.reject(new Error("offline")));
    const { result } = renderHook(
      () => useAddCuratedAnalysisToDashboard(spec, area, service),
      { wrapper: makeWrapper() }
    );

    let outcome = "";
    await act(async () => {
      outcome = await result.current.addNow();
    });

    expect(outcome).toBe("error");
    expect(entries()).toEqual([]);
    expect(addInsightWidget).not.toHaveBeenCalled();
  });

  it("reads as added for a curated widget already on the dashboard, and addNow is a no-op", async () => {
    const service = fakeService(() => Promise.resolve(RESULT));
    const { result } = renderHook(
      () => useAddCuratedAnalysisToDashboard(spec, area, service),
      { wrapper: makeWrapper({ ...dashboard, widgets: [curatedTclWidget] }) }
    );

    expect(result.current.added).toBe(true);

    let outcome = "";
    await act(async () => {
      outcome = await result.current.addNow();
    });

    expect(outcome).toBe("not-allowed");
    expect(service.run).not.toHaveBeenCalled();
    expect(addInsightWidget).not.toHaveBeenCalled();

    act(() => result.current.remove());
    await waitFor(() =>
      expect(deleteWidget).toHaveBeenCalledWith("d1", "w-tcl")
    );
  });

  it("is not addable for a non-owner, and addNow is a no-op", async () => {
    useAuthStore.setState({ userId: "visitor" });
    const service = fakeService(() => Promise.resolve(RESULT));
    const { result } = renderHook(
      () => useAddCuratedAnalysisToDashboard(spec, area, service),
      { wrapper: makeWrapper() }
    );

    expect(result.current.canAdd).toBe(false);

    let outcome = "";
    await act(async () => {
      outcome = await result.current.addNow();
    });

    expect(outcome).toBe("not-allowed");
    expect(service.run).not.toHaveBeenCalled();
    expect(entries()).toEqual([]);
  });

  it("treats a 409 on add as success: no toast, module cleared", async () => {
    const service = fakeService(() => Promise.resolve(RESULT));
    vi.mocked(addInsightWidget).mockRejectedValueOnce(
      Object.assign(new Error("Conflict"), { status: 409 })
    );
    vi.mocked(getDashboard).mockResolvedValueOnce(dashboard);
    const { result } = renderHook(
      () => useAddCuratedAnalysisToDashboard(spec, area, service),
      { wrapper: makeWrapper() }
    );

    await act(async () => {
      await result.current.addNow();
    });

    expect(addInsightWidget).toHaveBeenCalledWith("d1", "ins-1", undefined);
    expect(entries()).toEqual([]);
    expect(toaster.create).not.toHaveBeenCalled();
  });
});
