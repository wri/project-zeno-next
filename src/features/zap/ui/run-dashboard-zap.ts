import { queryClient } from "@/app/lib/query-client";
import { analysisService } from "@/src/features/analysis";
// Deep imports, not the dashboards barrel: the barrel exports the dashboard
// page, which mounts the chat panel, which mounts the zap panel.
import {
  addSection,
  addWidget,
  applyAnalysisTemplate,
  deleteSection,
  deleteWidget,
  renameDashboard,
  updateSection,
  updateWidget,
} from "@/src/features/dashboards/api/dashboards";
import type { Dashboard } from "@/src/features/dashboards/api/schemas";
import { dashboardKeys } from "@/src/features/dashboards/hooks/dashboardKeys";

import { createMosaic } from "../api/mosaic-client";
import { fetchZapPlan } from "../api/zap-client";
import useZapDashboardStore from "../model/zap-dashboard-store";
import type { ZapDashboardRow, ZapEditIds } from "../model/zap-dashboard-trail";
import {
  isMapStep,
  type ZapAddChartArgs,
  type ZapChoose,
  type ZapCurrent,
  type ZapDashboardStep,
  type ZapPlan,
  type ZapWidgetBody,
} from "../model/zap-plan";
import { isZapBusy } from "./run-zap";

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** What one step did: the ids it added or changed and the warnings to show. */
interface StepResult {
  edited: Partial<ZapEditIds>;
  warnings?: string[];
}

/** A step that failed after it changed the dashboard, e.g. a new widget with the old one still there. */
class PartialStepError extends Error {
  constructor(
    message: string,
    readonly result: StepResult
  ) {
    super(message);
  }
}

type StepRunner<K extends ZapDashboardStep["kind"]> = (
  args: Extract<ZapDashboardStep, { kind: K }>["args"]
) => Promise<StepResult>;

/** The id of the newest widget of the response that matches. */
function newestWidgetId(
  dashboard: Dashboard,
  matches: (widget: Dashboard["widgets"][number]) => boolean
): string[] {
  const newest = dashboard.widgets
    .filter(matches)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return newest ? [newest.id] : [];
}

/** Adds a widget and shows the dashboard again. */
async function addMapWidget(
  dashboardId: string,
  widget: ZapWidgetBody
): Promise<StepResult> {
  const dashboard = await addWidget(dashboardId, widget);
  return {
    edited: {
      widget_ids: newestWidgetId(
        dashboard,
        (w) => w.widget_type === widget.widget_type
      ),
    },
  };
}

/** Runs an analysis of the planner and gives its insight id. */
async function analyze(
  body: ZapAddChartArgs["analyze"],
  datasetName: string
): Promise<string> {
  const [aoi] = body.aois;
  const insight = await analysisService.run({
    area: {
      name: aoi.src_id,
      source: aoi.source,
      srcId: aoi.src_id,
      subtype: aoi.subtype,
    },
    dataset: { id: body.dataset_id, name: datasetName },
    startDate: body.start_date,
    endDate: body.end_date,
    contextLayer: body.context_layer ?? undefined,
    canopyCover: body.canopy_cover ?? undefined,
  });
  return insight.id;
}

/**
 * One runner for each dashboard step kind (docs/zap-mode-plan.md, "Dashboard
 * step contract" in the backend repository). A new step kind needs its type
 * in `ZapDashboardStep`, a runner here and its words in `doneText`
 * (`zap-dashboard-trail`).
 */
const STEP_RUNNERS: { [K in ZapDashboardStep["kind"]]: StepRunner<K> } = {
  add_chart: async ({ dashboard_id, dataset_name, analyze: body, widget }) => {
    const insightId = await analyze(body, dataset_name);
    try {
      const dashboard = await addWidget(dashboard_id, {
        ...widget,
        insight_id: insightId,
      });
      return {
        edited: {
          widget_ids: newestWidgetId(
            dashboard,
            (w) => w.insight_id === insightId
          ),
        },
      };
    } catch (error) {
      // 409: the insight is on the dashboard already.
      if ((error as { status?: number }).status !== 409) throw error;
      return {
        edited: {},
        warnings: [`The ${dataset_name} chart is on the dashboard already.`],
      };
    }
  },

  add_map: ({ dashboard_id, widget }) => addMapWidget(dashboard_id, widget),

  add_template: async ({ dashboard_id, template, args }) => {
    const result = await applyAnalysisTemplate(dashboard_id, template, args);
    // The response has the expanded dashboard, so no refetch is necessary.
    queryClient.setQueryData(
      dashboardKeys.detail(dashboard_id),
      result.dashboard
    );
    return {
      edited: {
        section_ids: [result.section_id],
        widget_ids: result.widget_ids,
      },
      warnings: result.warnings,
    };
  },

  add_imagery: async ({ dashboard_id, mosaic, widget }) => {
    const imagery = (widget.config.imagery ?? {}) as Record<string, unknown>;
    const built = await createMosaic(mosaic);
    if (built.mosaic_id !== imagery.mosaic_id) {
      // The tile URLs of the plan are for an other mosaic.
      throw new Error("The imagery does not agree with the plan.");
    }
    const stats = {
      item_count: built.item_count,
      start_date: built.date_start,
      end_date: built.date_end,
      mean_cloud_cover: built.mean_cloud_cover,
      min_cloud_cover: built.min_cloud_cover,
      max_cloud_cover_observed: built.max_cloud_cover,
    };
    return addMapWidget(dashboard_id, {
      ...widget,
      config: {
        ...widget.config,
        imagery: {
          ...imagery,
          ...Object.fromEntries(
            Object.entries(stats).filter(
              ([, v]) => v !== undefined && v !== null
            )
          ),
        },
      },
    });
  },

  add_section: async ({ dashboard_id, section }) => {
    const dashboard = await addSection(dashboard_id, section.title);
    const newest = [...dashboard.sections].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    )[0];
    return { edited: { section_ids: newest ? [newest.id] : [] } };
  },

  move: async ({ dashboard_id, widget_id, patch }) => {
    // `patch.section_id` null moves the widget to the top level.
    await updateWidget(dashboard_id, widget_id, patch);
    return { edited: { widget_ids: [widget_id] } };
  },

  resize: async ({ dashboard_id, widget_id, patch }) => {
    // `patch.config` is the full config: the endpoint replaces it.
    await updateWidget(dashboard_id, widget_id, patch);
    return { edited: { widget_ids: [widget_id] } };
  },

  rename: async ({ dashboard_id, target_type, section_id, title, patch }) => {
    if (target_type === "dashboard") {
      await renameDashboard(
        dashboard_id,
        typeof patch.name === "string" ? patch.name : title
      );
      return { edited: {} };
    }
    if (!section_id) throw new Error("The plan names no section.");
    await updateSection(dashboard_id, section_id, patch);
    return { edited: { section_ids: [section_id] } };
  },

  change_period: async (args) => {
    const { dashboard_id, widget_id, widget } = args;
    // 1. A chart: the analysis for the new period. If it fails, nothing changed.
    const insightId = args.analyze
      ? await analyze(args.analyze, args.dataset_name)
      : null;
    // 2. The new widget, at the position and in the section of the old one.
    const dashboard = await addWidget(dashboard_id, {
      ...widget,
      ...(insightId ? { insight_id: insightId } : {}),
    });
    const added = newestWidgetId(dashboard, (w) =>
      insightId
        ? w.insight_id === insightId
        : w.widget_type === widget.widget_type && w.id !== widget_id
    );
    // 3. Only when the new widget is there: remove the old one.
    if (args.replace !== false) {
      try {
        await deleteWidget(dashboard_id, widget_id);
      } catch (error) {
        throw new PartialStepError(
          `The new widget was added, but the old widget was not removed: ${message(error)}`,
          { edited: { widget_ids: added } }
        );
      }
    }
    return { edited: { widget_ids: added } };
  },

  remove: async ({
    dashboard_id,
    target_type,
    widget_id,
    section_id,
    delete_widgets,
  }) => {
    if (target_type === "widget") {
      if (!widget_id) throw new Error("The plan names no widget.");
      await deleteWidget(dashboard_id, widget_id);
    } else {
      if (!section_id) throw new Error("The plan names no section.");
      await deleteSection(dashboard_id, section_id, delete_widgets === true);
    }
    // The removed ids are not the target of a next request.
    return { edited: {} };
  },
};

function runStep(step: ZapDashboardStep): Promise<StepResult> {
  const runner = STEP_RUNNERS[step.kind] as StepRunner<typeof step.kind>;
  return runner(step.args as never);
}

let rowCount = 0;
const newRowId = () => `${Date.now().toString(36)}-d${++rowCount}`;

/**
 * The `current` of a dashboard request: the state of the last edit that was
 * not cancelled, so "and a map of it" adds the same data and "remove that"
 * has a target (`last_widget_ids`, `last_section_ids`). It has no area: the
 * planner uses the area of the dashboard.
 */
export function dashboardCurrent(
  rows: ZapDashboardRow[],
  dashboardId: string
): ZapCurrent {
  const last = rows.findLast(
    (row) => row.outcome !== "confirm" && row.outcome !== "cancelled"
  );
  const state: ZapCurrent = { ...last?.state };
  delete state.area;
  return { ...state, page: "dashboard", dashboard_id: dashboardId };
}

const orNull = (ids: string[]) => (ids.length > 0 ? ids : null);

/**
 * The state after the steps of a row ran. The ids of the edit come from the
 * responses of the endpoints, not from the planner: the planner does not
 * know the id of a new widget. A removal gives no ids, so the removed items
 * are not sent again. When no step changed the dashboard, the state is the
 * state before the request.
 */
function stateAfterRun(row: ZapDashboardRow): ZapCurrent {
  if (!row.stepStatus.includes("done") && row.outcome === "failed") {
    return row.before;
  }
  return {
    ...(row.plan.state ?? row.before),
    last_widget_ids: orNull(row.edited.widget_ids),
    last_section_ids: orNull(row.edited.section_ids),
  };
}

/** Shows the result of a step on the page, with no reload. */
function refreshDashboard(step: ZapDashboardStep): void {
  // A template step set the dashboard from its response.
  if (step.kind === "add_template") return;
  // A new name shows in the dashboard list too.
  const renamed =
    step.kind === "rename" && step.args.target_type === "dashboard";
  void queryClient.invalidateQueries({
    queryKey: renamed
      ? dashboardKeys.all
      : dashboardKeys.detail(step.args.dashboard_id),
  });
}

/**
 * Runs the steps of a row in order. A step that fails stops the run; the
 * steps before it stay applied and the steps after it are skipped. The page
 * shows each change when its step is done.
 */
async function runSteps(rowId: string): Promise<void> {
  const store = useZapDashboardStore.getState();
  const row = store.rows.find((r) => r.id === rowId);
  if (!row) return;
  store.setStatus("running");
  store.updateRow(rowId, () => ({ outcome: "running" }));

  const record = (result: StepResult) =>
    store.updateRow(rowId, (r) => ({
      edited: {
        widget_ids: [
          ...r.edited.widget_ids,
          ...(result.edited.widget_ids ?? []),
        ],
        section_ids: [
          ...r.edited.section_ids,
          ...(result.edited.section_ids ?? []),
        ],
      },
      warnings: [...r.warnings, ...(result.warnings ?? [])],
    }));
  const finish = () => {
    store.updateRow(rowId, (r) => ({ state: stateAfterRun(r) }));
    store.setStatus("done");
  };

  for (const [index, step] of row.plan.steps.entries()) {
    if (isMapStep(step) || !(step.kind in STEP_RUNNERS)) {
      // A map step, or a step kind of a later phase.
      store.setStep(rowId, index, "skipped");
      continue;
    }
    store.setStep(rowId, index, "running");
    try {
      const result = await runStep(step);
      store.setStep(rowId, index, "done");
      refreshDashboard(step);
      record(result);
    } catch (error) {
      if (error instanceof PartialStepError) {
        refreshDashboard(step);
        record(error.result);
      }
      store.setStep(rowId, index, "failed");
      store.updateRow(rowId, (r) => ({
        outcome: "failed",
        error: message(error),
        stepStatus: r.stepStatus.map((s, i) => (i > index ? "skipped" : s)),
      }));
      finish();
      return;
    }
  }
  store.updateRow(rowId, () => ({ outcome: "done" }));
  finish();
}

const needsConfirmation = (plan: ZapPlan) =>
  plan.steps.length > 0 && plan.needs_confirmation === true;

/** A chip of a preview: the option that the user selected in it. */
interface ZapChoice {
  key: string;
  value: string;
  /** The step kinds of the preview that showed the chip. */
  kinds: string[];
}

/**
 * Whether the click on a chip confirms the new plan. It does when the plan
 * did what the chip said: the planner used the selected option, the action
 * did not change (unless the chip selected the action), and no other
 * decision is unclear. Else the new plan shows as a preview again. A
 * backend that ignores `choose` never confirms.
 */
export function chipConfirms(plan: ZapPlan, choice: ZapChoice): boolean {
  const used = plan.decisions.some(
    (d) =>
      d.key === choice.key && d.value === choice.value && d.source === "user"
  );
  const unclear = plan.decisions.some(
    (d) => d.clear === false && d.key !== choice.key
  );
  const kinds = plan.steps.map((step) => step.kind);
  const sameAction =
    choice.key === "action" ||
    (kinds.length === choice.kinds.length &&
      kinds.every((kind, i) => kind === choice.kinds[i]));
  return used && !unclear && sameAction;
}

interface ZapRequestOptions {
  /** The `current` to send in place of the state of the trail. */
  current?: ZapCurrent;
  choose?: ZapChoose;
  /** The chip that made the request; it can confirm the new plan. */
  choice?: ZapChoice;
}

/**
 * Plans one prompt for a dashboard with `POST /api/zap` and adds it as a row
 * of the dashboard trail. A plan that needs a confirmation waits for
 * `applyDashboardPlan` (or for a chip); other plans run at once. The steps
 * run outside React, so they continue when the panel closes.
 */
export async function runDashboardZap(
  prompt: string,
  dashboardId: string,
  options: ZapRequestOptions = {}
): Promise<void> {
  const store = useZapDashboardStore.getState();
  store.open(dashboardId);
  if (isZapBusy(useZapDashboardStore.getState().status)) return;

  // A new request replaces a plan that waits for a confirmation.
  for (const row of useZapDashboardStore.getState().rows) {
    if (row.outcome === "confirm") cancelDashboardPlan(row.id);
  }
  const current =
    options.current ??
    dashboardCurrent(useZapDashboardStore.getState().rows, dashboardId);
  store.start(prompt);

  try {
    const plan = await fetchZapPlan(prompt, current, options.choose);
    const rowId = newRowId();
    const confirm =
      needsConfirmation(plan) &&
      !(options.choice && chipConfirms(plan, options.choice));
    store.addRow({
      id: rowId,
      prompt,
      plan,
      before: current,
      choose: options.choose ?? null,
      state: plan.state ?? current,
      stepStatus: plan.steps.map(() => "pending"),
      outcome:
        plan.steps.length === 0 ? "no-change" : confirm ? "confirm" : "running",
      error: null,
      warnings: [],
      edited: { widget_ids: [], section_ids: [] },
    });
    if (plan.steps.length === 0 || confirm) {
      store.setStatus("done");
      return;
    }
    await runSteps(rowId);
  } catch (error) {
    store.fail(message(error));
  }
}

/** Runs the steps of a plan that waits for a confirmation. */
export async function applyDashboardPlan(rowId: string): Promise<void> {
  const { rows, status } = useZapDashboardStore.getState();
  const row = rows.find((r) => r.id === rowId);
  if (row?.outcome !== "confirm" || isZapBusy(status)) return;
  await runSteps(rowId);
}

/** Drops a plan that waits for a confirmation. Nothing changes. */
export function cancelDashboardPlan(rowId: string): void {
  useZapDashboardStore.getState().updateRow(rowId, (row) =>
    row.outcome === "confirm"
      ? {
          outcome: "cancelled",
          stepStatus: row.stepStatus.map(() => "skipped"),
        }
      : {}
  );
}

/**
 * A chip of an edit decision: sends the same prompt and `current` again with
 * the selected option in `choose` (the contract of `POST /api/zap`).
 *
 * In a preview (`fromPreview`), the click is the confirmation: the new plan
 * runs at once if it did what the chip said (`chipConfirms`), else it shows
 * as a preview again. The waiting plan is cancelled. On a row that does not
 * wait, the new plan follows the usual rules.
 */
export async function chooseDashboardOption(
  rowId: string,
  key: string,
  value: string,
  fromPreview: boolean
): Promise<void> {
  const { rows, dashboardId } = useZapDashboardStore.getState();
  const row = rows.find((r) => r.id === rowId);
  if (!row || !dashboardId) return;
  const confirms = fromPreview && row.outcome === "confirm";
  await runDashboardZap(row.prompt, dashboardId, {
    current: row.before,
    choose: { ...row.choose, [key]: value },
    choice: confirms
      ? { key, value, kinds: row.plan.steps.map((step) => step.kind) }
      : undefined,
  });
}
