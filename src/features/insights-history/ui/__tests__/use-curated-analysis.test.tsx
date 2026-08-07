// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
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

import {
  addInsightWidget,
  deleteWidget,
} from "@/src/features/dashboards/api/dashboards";
import { dashboardKeys } from "@/src/features/dashboards/ui/dashboardQueries";
import type { Dashboard } from "@/src/features/dashboards/api/schemas";
import type { Chart } from "@/src/entities/insight";
import type { AnalysisService } from "@/src/features/analysis/model/analysis-service";
import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";
import type { CuratedAnalysisTemplate } from "../../lib/curated-analyses";
import { rememberCuratedRun } from "../../lib/curated-run-registry";
import { useCuratedAnalysis } from "../use-curated-analysis";

const template: CuratedAnalysisTemplate = {
  datasetId: 4,
  datasetName: "Tree cover loss",
  startDate: "2001-01-01",
  endDate: "2025-12-31",
};

function chart(id: string, yAxis: string): Chart {
  return {
    id,
    position: 0,
    title: "",
    type: "bar",
    xAxis: "year",
    yAxis,
    colorField: "",
    stackField: "",
    groupField: "",
    seriesFields: [],
    data: [],
  };
}

function dashboardWith(widgets: Dashboard["widgets"] = []): Dashboard {
  return {
    id: "d1",
    user_id: "u1",
    name: "Pará dashboard",
    description: null,
    is_public: false,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    aois: [
      {
        id: "aoi-1",
        position: 0,
        source: "gadm",
        src_id: "BRA.14_1",
        subtype: "state-province",
        name: "Pará",
      },
    ],
    widgets,
  };
}

function insightWidget(insightId: string): Dashboard["widgets"][number] {
  return {
    id: "w-1",
    position: 0,
    widget_type: "insight",
    insight_id: insightId,
    config: {},
    created_at: "2026-07-01T00:00:00Z",
    insight: {
      id: insightId,
      insight_text: "",
      codeact_parts: null,
      charts: [],
    },
  };
}

function makeWrapper(seed: Dashboard) {
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

function fakeService(result?: {
  id: string;
  charts: Chart[];
}): AnalysisService & { run: ReturnType<typeof vi.fn> } {
  return {
    run: vi.fn().mockResolvedValue(result ?? { id: "ins-new", charts: [] }),
  };
}

describe("useCuratedAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ userId: "u1" });
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d1" });
  });

  it("first toggle runs the analysis for the dashboard's AOI and adds the widget with per-chart titles", async () => {
    const service = fakeService({
      id: "ins-new",
      charts: [
        chart("c-loss", "tree_cover_loss_ha"),
        chart("c-em", "carbon_emissions_MgCO2e"),
      ],
    });
    const { result } = renderHook(() => useCuratedAnalysis(template, service), {
      wrapper: makeWrapper(dashboardWith()),
    });

    await waitFor(() => expect(result.current.addable).toBe(true));
    act(() => result.current.toggle());

    await waitFor(() =>
      expect(service.run).toHaveBeenCalledWith(
        {
          area: {
            name: "Pará",
            source: "gadm",
            srcId: "BRA.14_1",
            subtype: "state-province",
          },
          dataset: { id: 4, name: "Tree cover loss" },
          startDate: "2001-01-01",
          endDate: "2025-12-31",
        },
        expect.any(AbortSignal)
      )
    );
    await waitFor(() =>
      expect(addInsightWidget).toHaveBeenCalledWith("d1", "ins-new", {
        titles: {
          "c-loss": "Tree cover loss in Pará",
          "c-em": "GHG Emissions from Tree Cover Loss in Pará",
        },
      })
    );
  });

  it("re-adds a remembered insight, with its titles config, without re-running", async () => {
    rememberCuratedRun("d1", 4, {
      insightId: "ins-cur",
      config: { titles: { "c-loss": "Tree cover loss in Pará" } },
    });
    const service = fakeService();
    const { result } = renderHook(() => useCuratedAnalysis(template, service), {
      wrapper: makeWrapper(dashboardWith()),
    });

    await waitFor(() => expect(result.current.addable).toBe(true));
    act(() => result.current.toggle());

    await waitFor(() =>
      expect(addInsightWidget).toHaveBeenCalledWith("d1", "ins-cur", {
        titles: { "c-loss": "Tree cover loss in Pará" },
      })
    );
    expect(service.run).not.toHaveBeenCalled();
  });

  it("removes the widget (keeping the insight) when the template is shown", async () => {
    rememberCuratedRun("d1", 4, { insightId: "ins-cur" });
    const service = fakeService();
    const { result } = renderHook(() => useCuratedAnalysis(template, service), {
      wrapper: makeWrapper(dashboardWith([insightWidget("ins-cur")])),
    });

    await waitFor(() => expect(result.current.shown).toBe(true));
    act(() => result.current.toggle());

    await waitFor(() => expect(deleteWidget).toHaveBeenCalledWith("d1", "w-1"));
    expect(service.run).not.toHaveBeenCalled();
    expect(addInsightWidget).not.toHaveBeenCalled();
  });

  it("does not remember or attach a run that produced no charts", async () => {
    const service = fakeService({ id: "ins-empty", charts: [] });
    const { result } = renderHook(() => useCuratedAnalysis(template, service), {
      wrapper: makeWrapper(dashboardWith()),
    });

    await waitFor(() => expect(result.current.addable).toBe(true));
    act(() => result.current.toggle());

    await waitFor(() => expect(service.run).toHaveBeenCalled());
    await waitFor(() => expect(result.current.running).toBe(false));
    expect(addInsightWidget).not.toHaveBeenCalled();
    expect(result.current.shown).toBe(false);
  });

  it("is not addable for a viewer who doesn't own the dashboard", async () => {
    useAuthStore.setState({ userId: "someone-else" });
    const service = fakeService();
    const { result } = renderHook(() => useCuratedAnalysis(template, service), {
      wrapper: makeWrapper(dashboardWith()),
    });

    expect(result.current.addable).toBe(false);
    act(() => result.current.toggle());
    expect(service.run).not.toHaveBeenCalled();
  });

  it("titles the card '{dataset} in {area}' once the AOI is known", async () => {
    const service = fakeService();
    const { result } = renderHook(() => useCuratedAnalysis(template, service), {
      wrapper: makeWrapper(dashboardWith()),
    });

    await waitFor(() =>
      expect(result.current.title).toBe("Tree cover loss in Pará")
    );
  });
});
