import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ZapDashboardStep, ZapPlan } from "../../model/zap-plan";
import useZapDashboardStore from "../../model/zap-dashboard-store";

const fetchZapPlan = vi.fn();
const createMosaic = vi.fn();
const addWidget = vi.fn();
const applyAnalysisTemplate = vi.fn();
const runAnalysis = vi.fn();
const invalidateQueries = vi.fn();
const setQueryData = vi.fn();

vi.mock("../../api/zap-client", () => ({
  fetchZapPlan: (...args: unknown[]) => fetchZapPlan(...args),
}));
vi.mock("../../api/mosaic-client", () => ({
  createMosaic: (...args: unknown[]) => createMosaic(...args),
}));
vi.mock("@/src/features/dashboards/api/dashboards", () => ({
  addWidget: (...args: unknown[]) => addWidget(...args),
  applyAnalysisTemplate: (...args: unknown[]) => applyAnalysisTemplate(...args),
}));
vi.mock("@/src/features/analysis", () => ({
  analysisService: { run: (...args: unknown[]) => runAnalysis(...args) },
}));
vi.mock("@/app/lib/query-client", () => ({
  queryClient: {
    invalidateQueries: (...args: unknown[]) => invalidateQueries(...args),
    setQueryData: (...args: unknown[]) => setQueryData(...args),
  },
}));

const {
  applyDashboardPlan,
  cancelDashboardPlan,
  dashboardCurrent,
  runDashboardZap,
} = await import("../run-dashboard-zap");

const D = "d1";
const AOI = { source: "gadm", src_id: "BRA.14_1", subtype: "state-province" };

const CHART: ZapDashboardStep = {
  kind: "add_chart",
  title: "Add chart: Tree cover loss",
  detail: "2015–2025 · Pará, Brazil",
  args: {
    dashboard_id: D,
    dataset_name: "Tree cover loss",
    analyze: {
      aois: [AOI],
      dataset_id: 4,
      start_date: "2015-01-01",
      end_date: "2025-12-31",
      context_layer: "primary_forest",
      canopy_cover: null,
    },
    widget: {
      widget_type: "insight",
      insight_id: null,
      config: { default_view: "chart" },
    },
  },
};

const MAP: ZapDashboardStep = {
  kind: "add_map",
  title: "Add map: Tree cover loss due to fires",
  detail: "",
  args: {
    dashboard_id: D,
    dataset_name: "Tree cover loss due to fires",
    widget: {
      widget_type: "map",
      insight_id: null,
      config: { default_view: "map", dataset: { dataset_id: 10 } },
    },
  },
};

const TEMPLATE: ZapDashboardStep = {
  kind: "add_template",
  title: "Add section: Tree cover loss and its drivers",
  detail: "",
  args: { dashboard_id: D, template: "forest-loss-drivers", args: {} },
};

const IMAGERY: ZapDashboardStep = {
  kind: "add_imagery",
  title: "Add imagery: Sentinel-2",
  detail: "",
  args: {
    dashboard_id: D,
    mosaic: {
      source: "gadm",
      src_id: "BRA.14_1",
      target_date: "2025-03-16",
      window_days: 15,
      max_cloud_cover: 10,
      max_items: 50,
    },
    widget: {
      widget_type: "map",
      insight_id: null,
      config: {
        default_view: "map",
        imagery: { provider: "sentinel-2", mosaic_id: "m-1", tile_url: "t" },
      },
    },
  },
};

const STATE = {
  page: "dashboard" as const,
  dashboard_id: D,
  area: { name: "Pará, Brazil", source: "gadm", src_id: "BRA.14_1" },
  dataset_id: 4,
  start_date: "2015-01-01",
  end_date: "2025-12-31",
};

function plan(
  steps: ZapDashboardStep[],
  extra: Partial<ZapPlan> = {}
): ZapPlan {
  return {
    steps,
    decisions: [],
    notes: [],
    state: STATE,
    tier: steps.length ? 1 : null,
    needs_confirmation: false,
    ...extra,
  };
}

/** A dashboard response with widgets as `[id, type, insight, created]`. */
function dashboard(...widgets: [string, string, string | null, string][]) {
  return {
    id: D,
    widgets: widgets.map(([id, widget_type, insight_id, created_at]) => ({
      id,
      widget_type,
      insight_id,
      created_at,
    })),
  };
}

const lastRow = () => {
  const { rows } = useZapDashboardStore.getState();
  return rows[rows.length - 1];
};

describe("runDashboardZap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useZapDashboardStore.setState({ dashboardId: null });
    useZapDashboardStore.getState().open(D);
    useZapDashboardStore.getState().reset();
  });

  it("sends the page and the dashboard id, with no area", async () => {
    fetchZapPlan.mockResolvedValue(plan([]));

    await runDashboardZap("hello", D);

    expect(fetchZapPlan).toHaveBeenCalledWith("hello", {
      page: "dashboard",
      dashboard_id: D,
    });
  });

  it("sends the state of the last edit with the next request", async () => {
    fetchZapPlan.mockResolvedValueOnce(plan([MAP]));
    addWidget.mockResolvedValue(
      dashboard(["w1", "map", null, "2026-11-12T10:00:00Z"])
    );
    await runDashboardZap("a map of loss", D);

    fetchZapPlan.mockResolvedValueOnce(plan([]));
    await runDashboardZap("and a chart of it", D);

    const sent = fetchZapPlan.mock.lastCall?.[1];
    expect(sent).toEqual({ ...STATE, area: undefined });
    expect(sent).not.toHaveProperty("area");
  });

  it("add_chart: runs the analysis, then adds its insight as a widget", async () => {
    fetchZapPlan.mockResolvedValue(plan([CHART]));
    runAnalysis.mockResolvedValue({ id: "ins-9", charts: [] });
    addWidget.mockResolvedValue(
      dashboard(
        ["w-old", "insight", "ins-1", "2026-11-12T09:00:00Z"],
        ["w-new", "insight", "ins-9", "2026-11-12T10:00:00Z"]
      )
    );

    await runDashboardZap("a chart of tree cover loss", D);

    expect(runAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        area: expect.objectContaining({
          source: "gadm",
          srcId: "BRA.14_1",
          subtype: "state-province",
        }),
        dataset: { id: 4, name: "Tree cover loss" },
        startDate: "2015-01-01",
        endDate: "2025-12-31",
        contextLayer: "primary_forest",
        canopyCover: undefined,
      })
    );
    expect(addWidget).toHaveBeenCalledWith(D, {
      widget_type: "insight",
      insight_id: "ins-9",
      config: { default_view: "chart" },
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboards", D],
    });
    const row = lastRow();
    expect(row.outcome).toBe("done");
    expect(row.stepStatus).toEqual(["done"]);
    expect(row.added).toEqual({ widget_ids: ["w-new"], section_ids: [] });
    expect(useZapDashboardStore.getState().status).toBe("done");
  });

  it("add_map: adds the widget with the config of the step", async () => {
    fetchZapPlan.mockResolvedValue(plan([MAP]));
    addWidget.mockResolvedValue(
      dashboard(
        ["w1", "map", null, "2026-11-12T09:00:00Z"],
        ["w2", "map", null, "2026-11-12T10:00:00Z"]
      )
    );

    await runDashboardZap("a map of fires", D);

    expect(addWidget).toHaveBeenCalledWith(D, MAP.args.widget);
    expect(lastRow().added.widget_ids).toEqual(["w2"]);
  });

  it("add_template: adds the section and shows its warnings", async () => {
    fetchZapPlan.mockResolvedValue(plan([TEMPLATE]));
    const expanded = dashboard();
    applyAnalysisTemplate.mockResolvedValue({
      section_id: "s1",
      widget_ids: ["w1", "w2"],
      warnings: ["No cloud-free imagery."],
      dashboard: expanded,
    });

    await runDashboardZap("the drivers analysis", D);

    expect(applyAnalysisTemplate).toHaveBeenCalledWith(
      D,
      "forest-loss-drivers",
      {}
    );
    expect(setQueryData).toHaveBeenCalledWith(["dashboards", D], expanded);
    const row = lastRow();
    expect(row.added).toEqual({
      widget_ids: ["w1", "w2"],
      section_ids: ["s1"],
    });
    expect(row.warnings).toEqual(["No cloud-free imagery."]);
  });

  it("add_imagery: builds the mosaic first, then adds the widget with its statistics", async () => {
    fetchZapPlan.mockResolvedValue(plan([IMAGERY]));
    createMosaic.mockResolvedValue({
      mosaic_id: "m-1",
      item_count: 12,
      date_start: "2025-03-01",
      date_end: "2025-03-30",
      mean_cloud_cover: 3.2,
      min_cloud_cover: 0.1,
      max_cloud_cover: 9.8,
    });
    addWidget.mockResolvedValue(
      dashboard(["w1", "map", null, "2026-11-12T10:00:00Z"])
    );

    await runDashboardZap("recent imagery", D);

    expect(createMosaic).toHaveBeenCalledWith(IMAGERY.args.mosaic);
    expect(createMosaic.mock.invocationCallOrder[0]).toBeLessThan(
      addWidget.mock.invocationCallOrder[0]
    );
    expect(addWidget).toHaveBeenCalledWith(D, {
      widget_type: "map",
      insight_id: null,
      config: {
        default_view: "map",
        imagery: {
          provider: "sentinel-2",
          mosaic_id: "m-1",
          tile_url: "t",
          item_count: 12,
          start_date: "2025-03-01",
          end_date: "2025-03-30",
          mean_cloud_cover: 3.2,
          min_cloud_cover: 0.1,
          max_cloud_cover_observed: 9.8,
        },
      },
    });
    expect(lastRow().added.widget_ids).toEqual(["w1"]);
  });

  it("add_imagery: adds no widget when the mosaic is not the mosaic of the plan", async () => {
    fetchZapPlan.mockResolvedValue(plan([IMAGERY]));
    createMosaic.mockResolvedValue({ mosaic_id: "other" });

    await runDashboardZap("recent imagery", D);

    expect(addWidget).not.toHaveBeenCalled();
    expect(lastRow().outcome).toBe("failed");
  });

  it("stops at a failed step, keeps the steps before it and skips the rest", async () => {
    fetchZapPlan.mockResolvedValue(plan([MAP, IMAGERY, TEMPLATE]));
    addWidget.mockResolvedValue(
      dashboard(["w1", "map", null, "2026-11-12T10:00:00Z"])
    );
    createMosaic.mockRejectedValue(new Error("No Sentinel-2 scenes found"));

    await runDashboardZap("a map, imagery and the drivers", D);

    const row = lastRow();
    expect(row.stepStatus).toEqual(["done", "failed", "skipped"]);
    expect(row.outcome).toBe("failed");
    expect(row.error).toBe("No Sentinel-2 scenes found");
    expect(row.added.widget_ids).toEqual(["w1"]);
    expect(applyAnalysisTemplate).not.toHaveBeenCalled();
    expect(useZapDashboardStore.getState().status).toBe("done");
  });

  it("adds a row with the notes and no steps when the planner changes nothing", async () => {
    fetchZapPlan.mockResolvedValue(
      plan([], { notes: ["You cannot edit this dashboard."], state: null })
    );

    await runDashboardZap("add a chart", D);

    const row = lastRow();
    expect(row.outcome).toBe("no-change");
    expect(row.plan.notes).toEqual(["You cannot edit this dashboard."]);
    expect(addWidget).not.toHaveBeenCalled();
  });

  it("keeps the trail when the planner fails", async () => {
    fetchZapPlan.mockRejectedValue(new Error("Zap failed (500)"));

    await runDashboardZap("add a chart", D);

    expect(useZapDashboardStore.getState().rows).toHaveLength(0);
    expect(useZapDashboardStore.getState().error).toBe("Zap failed (500)");
  });

  describe("a plan that needs a confirmation", () => {
    beforeEach(() => {
      fetchZapPlan.mockResolvedValue(
        plan([MAP], { tier: 2, needs_confirmation: true })
      );
      addWidget.mockResolvedValue(
        dashboard(["w1", "map", null, "2026-11-12T10:00:00Z"])
      );
    });

    it("runs no step before Apply", async () => {
      await runDashboardZap("something about fires", D);

      expect(addWidget).not.toHaveBeenCalled();
      expect(lastRow().outcome).toBe("confirm");
      expect(lastRow().stepStatus).toEqual(["pending"]);
    });

    it("runs the steps on Apply", async () => {
      await runDashboardZap("something about fires", D);
      await applyDashboardPlan(lastRow().id);

      expect(addWidget).toHaveBeenCalledTimes(1);
      expect(lastRow().outcome).toBe("done");
      expect(lastRow().added.widget_ids).toEqual(["w1"]);

      // A second Apply does nothing.
      await applyDashboardPlan(lastRow().id);
      expect(addWidget).toHaveBeenCalledTimes(1);
    });

    it("changes nothing on Cancel", async () => {
      await runDashboardZap("something about fires", D);
      cancelDashboardPlan(lastRow().id);
      await applyDashboardPlan(lastRow().id);

      expect(addWidget).not.toHaveBeenCalled();
      expect(lastRow().outcome).toBe("cancelled");
    });

    it("is cancelled by a new request, and its state is not sent", async () => {
      await runDashboardZap("something about fires", D);
      const waiting = lastRow().id;
      fetchZapPlan.mockResolvedValue(plan([]));

      await runDashboardZap("Tree cover loss due to fires", D);

      const rows = useZapDashboardStore.getState().rows;
      expect(rows.find((r) => r.id === waiting)?.outcome).toBe("cancelled");
      expect(fetchZapPlan).toHaveBeenLastCalledWith(
        "Tree cover loss due to fires",
        {
          page: "dashboard",
          dashboard_id: D,
        }
      );
    });
  });
});

describe("dashboardCurrent", () => {
  it("is the page and the id when the trail is empty", () => {
    expect(dashboardCurrent([], D)).toEqual({
      page: "dashboard",
      dashboard_id: D,
    });
  });
});
