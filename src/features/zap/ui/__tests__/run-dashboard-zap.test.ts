import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ZapDashboardStep, ZapPlan } from "../../model/zap-plan";
import useZapDashboardStore from "../../model/zap-dashboard-store";

const fetchZapPlan = vi.fn();
const createMosaic = vi.fn();
const addWidget = vi.fn();
const applyAnalysisTemplate = vi.fn();
const addSection = vi.fn();
const updateWidget = vi.fn();
const updateSection = vi.fn();
const renameDashboard = vi.fn();
const deleteWidget = vi.fn();
const deleteSection = vi.fn();
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
  addSection: (...args: unknown[]) => addSection(...args),
  updateWidget: (...args: unknown[]) => updateWidget(...args),
  updateSection: (...args: unknown[]) => updateSection(...args),
  renameDashboard: (...args: unknown[]) => renameDashboard(...args),
  deleteWidget: (...args: unknown[]) => deleteWidget(...args),
  deleteSection: (...args: unknown[]) => deleteSection(...args),
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
  chooseDashboardOption,
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

    expect(fetchZapPlan).toHaveBeenCalledWith(
      "hello",
      { page: "dashboard", dashboard_id: D },
      undefined
    );
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
    expect(sent).toEqual({
      ...STATE,
      area: undefined,
      last_widget_ids: ["w1"],
      last_section_ids: null,
    });
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
    expect(row.edited).toEqual({ widget_ids: ["w-new"], section_ids: [] });
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
    expect(lastRow().edited.widget_ids).toEqual(["w2"]);
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
    expect(row.edited).toEqual({
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
    expect(lastRow().edited.widget_ids).toEqual(["w1"]);
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
    expect(row.edited.widget_ids).toEqual(["w1"]);
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
      expect(lastRow().edited.widget_ids).toEqual(["w1"]);

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
        },
        undefined
      );
    });
  });
});

const SECTION: ZapDashboardStep = {
  kind: "add_section",
  title: 'Add section: "Fire season"',
  detail: "an empty section",
  args: { dashboard_id: D, section: { title: "Fire season" } },
};

const MOVE: ZapDashboardStep = {
  kind: "move",
  title: 'Move: Map "Tree cover loss"',
  detail: "to the top level",
  args: {
    dashboard_id: D,
    widget_id: "w1",
    widget_label: 'Map "Tree cover loss" in section "Drivers"',
    destination_label: "the top level",
    patch: { section_id: null },
  },
};

const RESIZE: ZapDashboardStep = {
  kind: "resize",
  title: 'Resize: Chart "Tree cover loss by driver"',
  detail: "full width (was half width)",
  args: {
    dashboard_id: D,
    widget_id: "w2",
    widget_label: 'Chart "Tree cover loss by driver"',
    size: "double",
    patch: { config: { default_view: "chart", size: "double" } },
  },
};

const RENAME_SECTION: ZapDashboardStep = {
  kind: "rename",
  title: 'Rename section: "Fires"',
  detail: 'to "Fire season"',
  args: {
    dashboard_id: D,
    target_type: "section",
    section_id: "s1",
    old_title: "Fires",
    title: "Fire season",
    patch: { title: "Fire season" },
  },
};

const RENAME_DASHBOARD: ZapDashboardStep = {
  kind: "rename",
  title: 'Rename dashboard: "Pará"',
  detail: 'to "Pará forests"',
  args: {
    dashboard_id: D,
    target_type: "dashboard",
    section_id: null,
    old_title: "Pará",
    title: "Pará forests",
    patch: { name: "Pará forests" },
  },
};

const PERIOD: ZapDashboardStep = {
  kind: "change_period",
  title: 'New period: Chart "Tree cover loss per year"',
  detail: "2015–2020 (was 2001–2025) · replaces the widget",
  args: {
    dashboard_id: D,
    widget_id: "w-old",
    widget_label: 'Chart "Tree cover loss per year" in section "Overview"',
    dataset_name: "Tree cover loss",
    old_start_date: "2001-01-01",
    old_end_date: "2025-12-31",
    replace: true,
    analyze: {
      aois: [AOI],
      dataset_id: 4,
      start_date: "2015-01-01",
      end_date: "2020-12-31",
      context_layer: "primary_forest",
      canopy_cover: 30,
    },
    widget: {
      widget_type: "insight",
      insight_id: null,
      config: { default_view: "chart", size: "single" },
      position: 0,
      section_id: "s0",
    },
  },
};

const REMOVE_WIDGET: ZapDashboardStep = {
  kind: "remove",
  title: 'Remove: Chart "Tree cover loss per year"',
  detail: "the insight stays",
  args: {
    dashboard_id: D,
    target_type: "widget",
    widget_id: "w1",
    section_id: null,
    label: 'Chart "Tree cover loss per year"',
    delete_widgets: false,
    widget_labels: [],
  },
};

const REMOVE_SECTION: ZapDashboardStep = {
  kind: "remove",
  title: 'Remove section: "Fires"',
  detail: "its 1 widget moves to the top level",
  args: {
    dashboard_id: D,
    target_type: "section",
    widget_id: null,
    section_id: "s1",
    label: 'Section "Fires" (1 widget)',
    delete_widgets: false,
    widget_labels: ['Chart "Fires" in section "Fires"'],
  },
};

const TARGET = {
  question: "Target",
  label: 'Chart "Tree cover loss per year"',
  probability: 0.92,
  source: "jev" as const,
  clear: true,
  key: "target",
  value: "widget:w1",
  options: [
    {
      label: 'Chart "Tree cover loss by driver"',
      probability: 0.05,
      value: "widget:w2",
    },
  ],
};

/** A tier 2 plan with the target decision. */
const confirmPlan = (step: ZapDashboardStep, decisions = [TARGET]) =>
  plan([step], { tier: 2, needs_confirmation: true, decisions });

describe("dashboard edits", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useZapDashboardStore.setState({ dashboardId: null });
    useZapDashboardStore.getState().open(D);
    useZapDashboardStore.getState().reset();
  });

  it("add_section: adds the section and keeps its id", async () => {
    fetchZapPlan.mockResolvedValue(plan([SECTION]));
    addSection.mockResolvedValue({
      ...dashboard(),
      sections: [
        { id: "s0", created_at: "2026-11-12T09:00:00Z" },
        { id: "s9", created_at: "2026-11-12T10:00:00Z" },
      ],
    });

    await runDashboardZap("add a section called Fire season", D);

    expect(addSection).toHaveBeenCalledWith(D, "Fire season");
    expect(lastRow().edited).toEqual({ widget_ids: [], section_ids: ["s9"] });
    expect(lastRow().state.last_section_ids).toEqual(["s9"]);
    expect(lastRow().state.last_widget_ids).toBeNull();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboards", D],
    });
  });

  it("move: sends the patch with the null section to the top level", async () => {
    fetchZapPlan.mockResolvedValue(plan([MOVE]));

    await runDashboardZap("move the map to the top", D);

    expect(updateWidget).toHaveBeenCalledWith(D, "w1", { section_id: null });
    expect(lastRow().outcome).toBe("done");
    expect(lastRow().edited.widget_ids).toEqual(["w1"]);
  });

  it("resize: sends the full config with the new size", async () => {
    fetchZapPlan.mockResolvedValue(plan([RESIZE]));

    await runDashboardZap("make the driver chart full width", D);

    expect(updateWidget).toHaveBeenCalledWith(D, "w2", {
      config: { default_view: "chart", size: "double" },
    });
    expect(lastRow().state.last_widget_ids).toEqual(["w2"]);
  });

  it("rename: a section", async () => {
    fetchZapPlan.mockResolvedValue(plan([RENAME_SECTION]));

    await runDashboardZap("rename Fires to Fire season", D);

    expect(updateSection).toHaveBeenCalledWith(D, "s1", {
      title: "Fire season",
    });
    expect(lastRow().edited.section_ids).toEqual(["s1"]);
  });

  it("rename: the dashboard, and the list shows the new name", async () => {
    fetchZapPlan.mockResolvedValue(plan([RENAME_DASHBOARD]));

    await runDashboardZap("call this dashboard Pará forests", D);

    expect(renameDashboard).toHaveBeenCalledWith(D, "Pará forests");
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboards"],
    });
    expect(lastRow().outcome).toBe("done");
  });

  describe("change_period", () => {
    beforeEach(() => {
      fetchZapPlan.mockResolvedValue(confirmPlan(PERIOD));
    });

    it("runs the analysis, adds the new widget in the place of the old one, then removes the old one", async () => {
      runAnalysis.mockResolvedValue({ id: "ins-new" });
      addWidget.mockResolvedValue(
        dashboard(
          ["w-old", "insight", "ins-old", "2026-11-12T09:00:00Z"],
          ["w-new", "insight", "ins-new", "2026-11-12T10:00:00Z"]
        )
      );

      await runDashboardZap("show it for 2015 to 2020", D);
      expect(runAnalysis).not.toHaveBeenCalled();
      await applyDashboardPlan(lastRow().id);

      expect(runAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: "2015-01-01",
          endDate: "2020-12-31",
          canopyCover: 30,
        })
      );
      expect(addWidget).toHaveBeenCalledWith(D, {
        widget_type: "insight",
        insight_id: "ins-new",
        config: { default_view: "chart", size: "single" },
        position: 0,
        section_id: "s0",
      });
      expect(deleteWidget).toHaveBeenCalledWith(D, "w-old");
      expect(addWidget.mock.invocationCallOrder[0]).toBeLessThan(
        deleteWidget.mock.invocationCallOrder[0]
      );
      expect(lastRow().outcome).toBe("done");
      expect(lastRow().state.last_widget_ids).toEqual(["w-new"]);
    });

    it("keeps the old widget when the analysis fails", async () => {
      runAnalysis.mockRejectedValue(new Error("Analysis failed"));

      await runDashboardZap("show it for 2015 to 2020", D);
      await applyDashboardPlan(lastRow().id);

      expect(addWidget).not.toHaveBeenCalled();
      expect(deleteWidget).not.toHaveBeenCalled();
      expect(lastRow().outcome).toBe("failed");
      expect(lastRow().error).toBe("Analysis failed");
      // Nothing changed, so the next request sends the state from before.
      expect(lastRow().state).toEqual(lastRow().before);
    });

    it("keeps the old widget when the add fails", async () => {
      runAnalysis.mockResolvedValue({ id: "ins-new" });
      addWidget.mockRejectedValue(new Error("Failed (500)"));

      await runDashboardZap("show it for 2015 to 2020", D);
      await applyDashboardPlan(lastRow().id);

      expect(deleteWidget).not.toHaveBeenCalled();
      expect(lastRow().outcome).toBe("failed");
    });

    it("keeps the old widget when replace is false", async () => {
      fetchZapPlan.mockResolvedValue(
        confirmPlan({ ...PERIOD, args: { ...PERIOD.args, replace: false } })
      );
      runAnalysis.mockResolvedValue({ id: "ins-new" });
      addWidget.mockResolvedValue(
        dashboard(["w-new", "insight", "ins-new", "2026-11-12T10:00:00Z"])
      );

      await runDashboardZap("show it for 2015 to 2020", D);
      await applyDashboardPlan(lastRow().id);

      expect(deleteWidget).not.toHaveBeenCalled();
      expect(lastRow().outcome).toBe("done");
    });

    it("reports both widgets when the old one cannot be removed", async () => {
      runAnalysis.mockResolvedValue({ id: "ins-new" });
      addWidget.mockResolvedValue(
        dashboard(["w-new", "insight", "ins-new", "2026-11-12T10:00:00Z"])
      );
      deleteWidget.mockRejectedValue(new Error("Failed (500)"));

      await runDashboardZap("show it for 2015 to 2020", D);
      await applyDashboardPlan(lastRow().id);

      expect(lastRow().outcome).toBe("failed");
      expect(lastRow().error).toMatch(/old widget was not removed/);
      expect(lastRow().edited.widget_ids).toEqual(["w-new"]);
    });
  });

  describe("remove", () => {
    it("removes a widget after the confirmation", async () => {
      fetchZapPlan.mockResolvedValue(confirmPlan(REMOVE_WIDGET));

      await runDashboardZap("remove the loss chart", D);
      expect(deleteWidget).not.toHaveBeenCalled();
      await applyDashboardPlan(lastRow().id);

      expect(deleteWidget).toHaveBeenCalledWith(D, "w1");
      expect(lastRow().outcome).toBe("done");
    });

    it("removes a section and keeps its widgets, as the step says", async () => {
      fetchZapPlan.mockResolvedValue(confirmPlan(REMOVE_SECTION));

      await runDashboardZap("remove the Fires section", D);
      await applyDashboardPlan(lastRow().id);

      expect(deleteSection).toHaveBeenCalledWith(D, "s1", false);
    });

    it("removes a section with its widgets, as the step says", async () => {
      fetchZapPlan.mockResolvedValue(
        confirmPlan({
          ...REMOVE_SECTION,
          args: { ...REMOVE_SECTION.args, delete_widgets: true },
        })
      );

      await runDashboardZap("remove the Fires section and its charts", D);
      await applyDashboardPlan(lastRow().id);

      expect(deleteSection).toHaveBeenCalledWith(D, "s1", true);
    });
  });

  it("stops at a failed step in the middle", async () => {
    fetchZapPlan.mockResolvedValue(plan([SECTION, MOVE, RESIZE]));
    addSection.mockResolvedValue({
      ...dashboard(),
      sections: [{ id: "s9", created_at: "2026-11-12T10:00:00Z" }],
    });
    updateWidget.mockRejectedValueOnce(new Error("Failed (404)"));

    await runDashboardZap("a section, and move and resize the map", D);

    const row = lastRow();
    expect(row.stepStatus).toEqual(["done", "failed", "skipped"]);
    expect(row.outcome).toBe("failed");
    expect(row.error).toBe("Failed (404)");
    expect(updateWidget).toHaveBeenCalledTimes(1);
    expect(row.state.last_section_ids).toEqual(["s9"]);
  });

  describe("last-edit ids in current", () => {
    it("sends the new widget after an addition", async () => {
      fetchZapPlan.mockResolvedValueOnce(plan([MAP]));
      addWidget.mockResolvedValue(
        dashboard(["w7", "map", null, "2026-11-12T10:00:00Z"])
      );
      await runDashboardZap("a map of fires", D);

      fetchZapPlan.mockResolvedValueOnce(plan([]));
      await runDashboardZap("remove that", D);

      expect(fetchZapPlan.mock.lastCall?.[1]).toMatchObject({
        last_widget_ids: ["w7"],
        last_section_ids: null,
      });
    });

    it("does not send the removed ids again", async () => {
      // The planner state still holds the ids of the edit before.
      fetchZapPlan.mockResolvedValueOnce({
        ...confirmPlan(REMOVE_WIDGET),
        state: { ...STATE, last_widget_ids: ["w1"] },
      });

      await runDashboardZap("remove that", D);
      await applyDashboardPlan(lastRow().id);
      expect(lastRow().state.last_widget_ids).toBeNull();

      fetchZapPlan.mockResolvedValueOnce(plan([]));
      await runDashboardZap("and a chart", D);
      const sent = fetchZapPlan.mock.lastCall?.[1];
      expect(sent.last_widget_ids).toBeNull();
      expect(sent.last_section_ids).toBeNull();
    });

    it("sends the ids from before when a failed step changed nothing", async () => {
      fetchZapPlan.mockResolvedValueOnce(plan([MAP]));
      addWidget.mockResolvedValueOnce(
        dashboard(["w7", "map", null, "2026-11-12T10:00:00Z"])
      );
      await runDashboardZap("a map of fires", D);

      fetchZapPlan.mockResolvedValueOnce(confirmPlan(REMOVE_WIDGET));
      deleteWidget.mockRejectedValueOnce(new Error("Failed (500)"));
      await runDashboardZap("remove that", D);
      await applyDashboardPlan(lastRow().id);

      fetchZapPlan.mockResolvedValueOnce(plan([]));
      await runDashboardZap("remove that", D);
      expect(fetchZapPlan.mock.lastCall?.[1].last_widget_ids).toEqual(["w7"]);
    });
  });

  describe("preview", () => {
    it("runs no step before the confirmation", async () => {
      fetchZapPlan.mockResolvedValue(confirmPlan(REMOVE_WIDGET));

      await runDashboardZap("remove the loss chart", D);

      expect(deleteWidget).not.toHaveBeenCalled();
      expect(lastRow().outcome).toBe("confirm");
    });

    it("a chip sends the same prompt and current with choose, and applies the selected option", async () => {
      fetchZapPlan.mockResolvedValueOnce(confirmPlan(REMOVE_WIDGET));
      await runDashboardZap("remove the loss chart", D);
      const waiting = lastRow();

      const chosen = {
        ...REMOVE_WIDGET,
        args: { ...REMOVE_WIDGET.args, widget_id: "w2" },
      } as ZapDashboardStep;
      fetchZapPlan.mockResolvedValueOnce(
        confirmPlan(chosen, [
          { ...TARGET, value: "widget:w2", source: "user" as never },
        ])
      );
      await chooseDashboardOption(waiting.id, "target", "widget:w2", true);

      expect(fetchZapPlan).toHaveBeenLastCalledWith(
        "remove the loss chart",
        waiting.before,
        { target: "widget:w2" }
      );
      expect(deleteWidget).toHaveBeenCalledTimes(1);
      expect(deleteWidget).toHaveBeenCalledWith(D, "w2");
      const rows = useZapDashboardStore.getState().rows;
      expect(rows.find((r) => r.id === waiting.id)?.outcome).toBe("cancelled");
      expect(lastRow().outcome).toBe("done");
      expect(lastRow().choose).toEqual({ target: "widget:w2" });
    });

    it("a chip shows the plan again when the planner did not use the option", async () => {
      fetchZapPlan.mockResolvedValueOnce(confirmPlan(REMOVE_WIDGET));
      await runDashboardZap("remove the loss chart", D);
      // An older backend ignores `choose`.
      fetchZapPlan.mockResolvedValueOnce(confirmPlan(REMOVE_WIDGET));

      await chooseDashboardOption(lastRow().id, "target", "widget:w2", true);

      expect(deleteWidget).not.toHaveBeenCalled();
      expect(lastRow().outcome).toBe("confirm");
    });

    it("a chip shows the plan again when an other decision is not clear", async () => {
      fetchZapPlan.mockResolvedValueOnce(confirmPlan(MOVE));
      await runDashboardZap("move the map", D);
      fetchZapPlan.mockResolvedValueOnce(
        confirmPlan(MOVE, [
          { ...TARGET, value: "widget:w2", source: "user" as never },
          {
            ...TARGET,
            question: "Destination",
            key: "destination",
            value: "section:s1",
            clear: false,
          },
        ])
      );

      await chooseDashboardOption(lastRow().id, "target", "widget:w2", true);

      expect(updateWidget).not.toHaveBeenCalled();
      expect(lastRow().outcome).toBe("confirm");
    });

    it("an option of a row that does not wait is not a confirmation", async () => {
      fetchZapPlan.mockResolvedValueOnce(plan([MOVE], { decisions: [TARGET] }));
      await runDashboardZap("move the map", D);
      fetchZapPlan.mockResolvedValueOnce(
        confirmPlan(REMOVE_WIDGET, [
          { ...TARGET, value: "widget:w2", source: "user" as never },
        ])
      );

      await chooseDashboardOption(lastRow().id, "target", "widget:w2", false);

      expect(deleteWidget).not.toHaveBeenCalled();
      expect(lastRow().outcome).toBe("confirm");
    });

    it("Cancel changes nothing", async () => {
      fetchZapPlan.mockResolvedValue(confirmPlan(REMOVE_WIDGET));
      await runDashboardZap("remove the loss chart", D);

      cancelDashboardPlan(lastRow().id);
      await applyDashboardPlan(lastRow().id);

      expect(deleteWidget).not.toHaveBeenCalled();
      expect(lastRow().outcome).toBe("cancelled");
    });

    it("a new request cancels the waiting preview", async () => {
      fetchZapPlan.mockResolvedValueOnce(confirmPlan(PERIOD));
      await runDashboardZap("show it for 2015 to 2020", D);
      const waiting = lastRow().id;
      fetchZapPlan.mockResolvedValueOnce(plan([]));

      await runDashboardZap("never mind", D);
      await applyDashboardPlan(waiting);

      const rows = useZapDashboardStore.getState().rows;
      expect(rows.find((r) => r.id === waiting)?.outcome).toBe("cancelled");
      expect(runAnalysis).not.toHaveBeenCalled();
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
