import { queryClient } from "@/app/lib/query-client";
import { analysisService } from "@/src/features/analysis";
// Deep imports, not the dashboards barrel: the barrel exports the dashboard
// page, which mounts the chat panel, which mounts the zap panel.
import {
  addWidget,
  applyAnalysisTemplate,
} from "@/src/features/dashboards/api/dashboards";
import type { Dashboard } from "@/src/features/dashboards/api/schemas";
import { dashboardKeys } from "@/src/features/dashboards/hooks/dashboardKeys";

import { createMosaic } from "../api/mosaic-client";
import { fetchZapPlan } from "../api/zap-client";
import useZapDashboardStore from "../model/zap-dashboard-store";
import type { ZapDashboardRow, ZapEditIds } from "../model/zap-dashboard-trail";
import {
  isMapStep,
  type ZapCurrent,
  type ZapDashboardStep,
  type ZapPlan,
  type ZapWidgetBody,
} from "../model/zap-plan";
import { isZapBusy } from "./run-zap";

/** What one step did: the ids it added and the warnings to show. */
interface StepResult {
  added: Partial<ZapEditIds>;
  warnings?: string[];
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
    added: {
      widget_ids: newestWidgetId(
        dashboard,
        (w) => w.widget_type === widget.widget_type
      ),
    },
  };
}

/**
 * One runner for each dashboard step kind (docs/zap-mode-plan.md, "Dashboard
 * step contract" in the backend repository). A new step kind needs its type
 * in `ZapDashboardStep`, a runner here and a name in `zap-dashboard-trail`.
 */
const STEP_RUNNERS: { [K in ZapDashboardStep["kind"]]: StepRunner<K> } = {
  add_chart: async ({ dashboard_id, dataset_name, analyze, widget }) => {
    const [aoi] = analyze.aois;
    const insight = await analysisService.run({
      area: {
        name: aoi.src_id,
        source: aoi.source,
        srcId: aoi.src_id,
        subtype: aoi.subtype,
      },
      dataset: { id: analyze.dataset_id, name: dataset_name },
      startDate: analyze.start_date,
      endDate: analyze.end_date,
      contextLayer: analyze.context_layer ?? undefined,
      canopyCover: analyze.canopy_cover ?? undefined,
    });
    try {
      const dashboard = await addWidget(dashboard_id, {
        ...widget,
        insight_id: insight.id,
      });
      return {
        added: {
          widget_ids: newestWidgetId(
            dashboard,
            (w) => w.insight_id === insight.id
          ),
        },
      };
    } catch (error) {
      // 409: the insight is on the dashboard already.
      if ((error as { status?: number }).status !== 409) throw error;
      return {
        added: {},
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
      added: {
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
};

function runStep(step: ZapDashboardStep): Promise<StepResult> {
  const runner = STEP_RUNNERS[step.kind] as StepRunner<typeof step.kind>;
  return runner(step.args as never);
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

let rowCount = 0;
const newRowId = () => `${Date.now().toString(36)}-d${++rowCount}`;

/**
 * The `current` of a dashboard request: the state of the last edit that was
 * not cancelled, so "and a map of it" adds the same data. It has no area:
 * the planner uses the area of the dashboard.
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

/**
 * Runs the steps of a row in order. A step that fails stops the run; the
 * steps before it stay applied and the steps after it are skipped. The page
 * shows each new widget when its step is done.
 */
async function runSteps(rowId: string): Promise<void> {
  const store = useZapDashboardStore.getState();
  const row = store.rows.find((r) => r.id === rowId);
  if (!row) return;
  store.setStatus("running");
  store.updateRow(rowId, () => ({ outcome: "running" }));

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
      // The page shows the new widget. A template step set the dashboard.
      if (step.kind !== "add_template") {
        void queryClient.invalidateQueries({
          queryKey: dashboardKeys.detail(step.args.dashboard_id),
        });
      }
      store.updateRow(rowId, (r) => ({
        added: {
          widget_ids: [
            ...r.added.widget_ids,
            ...(result.added.widget_ids ?? []),
          ],
          section_ids: [
            ...r.added.section_ids,
            ...(result.added.section_ids ?? []),
          ],
        },
        warnings: [...r.warnings, ...(result.warnings ?? [])],
      }));
    } catch (error) {
      store.setStep(rowId, index, "failed");
      store.updateRow(rowId, (r) => ({
        outcome: "failed",
        error: message(error),
        stepStatus: r.stepStatus.map((s, i) => (i > index ? "skipped" : s)),
      }));
      store.setStatus("done");
      return;
    }
  }
  store.updateRow(rowId, () => ({ outcome: "done" }));
  store.setStatus("done");
}

const needsConfirmation = (plan: ZapPlan) =>
  plan.steps.length > 0 && plan.needs_confirmation === true;

/**
 * Plans one prompt for a dashboard with `POST /api/zap` and adds it as a row
 * of the dashboard trail. A plan that needs a confirmation waits for
 * `applyDashboardPlan`; other plans run at once. The steps run outside
 * React, so they continue when the panel closes.
 */
export async function runDashboardZap(
  prompt: string,
  dashboardId: string
): Promise<void> {
  const store = useZapDashboardStore.getState();
  store.open(dashboardId);
  if (isZapBusy(useZapDashboardStore.getState().status)) return;

  // A new request replaces a plan that waits for a confirmation.
  for (const row of useZapDashboardStore.getState().rows) {
    if (row.outcome === "confirm") cancelDashboardPlan(row.id);
  }
  const current = dashboardCurrent(
    useZapDashboardStore.getState().rows,
    dashboardId
  );
  store.start(prompt);

  try {
    const plan = await fetchZapPlan(prompt, current);
    const rowId = newRowId();
    const confirm = needsConfirmation(plan);
    store.addRow({
      id: rowId,
      prompt,
      plan,
      state: plan.state ?? current,
      stepStatus: plan.steps.map(() => "pending"),
      outcome:
        plan.steps.length === 0 ? "no-change" : confirm ? "confirm" : "running",
      error: null,
      warnings: [],
      added: { widget_ids: [], section_ids: [] },
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
