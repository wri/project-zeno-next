import {
  isMapStep,
  type ZapCurrent,
  type ZapDashboardStep,
  type ZapPlan,
  type ZapStepStatus,
} from "./zap-plan";
import { TRAIL_LIMIT } from "./zap-trail";

/**
 * What a dashboard request did:
 * - `confirm`: the plan waits for Apply or Cancel.
 * - `cancelled`: the user cancelled the plan. Nothing changed.
 * - `running`: the steps run now.
 * - `done`: all steps are done.
 * - `failed`: a step failed. The steps before it stay applied.
 * - `no-change`: the plan has no steps.
 */
export type ZapEditOutcome =
  | "confirm"
  | "cancelled"
  | "running"
  | "done"
  | "failed"
  | "no-change";

/** The ids of the widgets and the sections that a request added. */
export interface ZapEditIds {
  widget_ids: string[];
  section_ids: string[];
}

/**
 * One request on a dashboard. A row is a record of the edit. It cannot put
 * the dashboard back in an earlier state, so a dashboard has no undo.
 */
export interface ZapDashboardRow {
  id: string;
  prompt: string;
  plan: ZapPlan;
  /** The state to send as `current` with the next request. */
  state: ZapCurrent;
  stepStatus: ZapStepStatus[];
  outcome: ZapEditOutcome;
  /** The error of the step that failed. */
  error: string | null;
  /** The warnings of the steps, e.g. a template widget that was left out. */
  warnings: string[];
  added: ZapEditIds;
}

/** The trail of one dashboard. `index` is the row that shows its plan. */
export interface ZapDashboardTrail {
  rows: ZapDashboardRow[];
  index: number;
}

export const EMPTY_DASHBOARD_TRAIL: ZapDashboardTrail = { rows: [], index: -1 };

const KEY_PREFIX = "gnw:zap-dashboard-trail:";
const TRAIL_VERSION = 1;

const trailKey = (dashboardId: string) => `${KEY_PREFIX}${dashboardId}`;

function sessionStore(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Reads the trail of one dashboard. Bad or missing data gives an empty trail. */
export function loadDashboardTrail(
  dashboardId: string,
  storage = sessionStore()
): ZapDashboardTrail {
  try {
    const raw = storage?.getItem(trailKey(dashboardId));
    if (!raw) return EMPTY_DASHBOARD_TRAIL;
    const stored = JSON.parse(raw) as Partial<ZapDashboardTrail> & {
      version?: number;
    };
    if (stored.version !== TRAIL_VERSION || !Array.isArray(stored.rows)) {
      return EMPTY_DASHBOARD_TRAIL;
    }
    // After a reload, no step runs: a row that was running stays as it is.
    const rows = stored.rows.slice(-TRAIL_LIMIT);
    return { rows, index: rows.length - 1 };
  } catch {
    return EMPTY_DASHBOARD_TRAIL;
  }
}

/** Writes the trail of one dashboard. Does nothing when storage fails. */
export function saveDashboardTrail(
  dashboardId: string,
  trail: ZapDashboardTrail,
  storage = sessionStore()
): void {
  try {
    if (trail.rows.length === 0) {
      storage?.removeItem(trailKey(dashboardId));
      return;
    }
    storage?.setItem(
      trailKey(dashboardId),
      JSON.stringify({ version: TRAIL_VERSION, rows: trail.rows })
    );
  } catch {
    // The trail stays in memory only.
  }
}

/** Adds a row at the end and selects it. A full trail drops its oldest row. */
export function addDashboardRow(
  trail: ZapDashboardTrail,
  row: ZapDashboardRow
): ZapDashboardTrail {
  const rows = [...trail.rows, row].slice(-TRAIL_LIMIT);
  return { rows, index: rows.length - 1 };
}

/** The name of what a step adds, e.g. "Tree cover loss chart". */
function addedName(step: ZapDashboardStep): string {
  switch (step.kind) {
    case "add_chart":
      return `${step.args.dataset_name} chart`;
    case "add_map":
      return `${step.args.dataset_name} map`;
    case "add_imagery":
      return `Sentinel-2 imagery around ${step.args.mosaic.target_date}`;
    case "add_template":
      // The title is "Add section: <name>".
      return step.title.split(": ").slice(1).join(": ") || step.args.template;
  }
}

/** The names of the dashboard steps of a row, with a status or all. */
function names(row: ZapDashboardRow, status?: ZapStepStatus): string {
  return row.plan.steps
    .filter(
      (step, i) => !isMapStep(step) && (!status || row.stepStatus[i] === status)
    )
    .map((step) => addedName(step as ZapDashboardStep))
    .join(", ");
}

/** The edit of a row in one line, for the trail. */
export function editSummary(row: ZapDashboardRow): string {
  const added = names(row, "done");
  switch (row.outcome) {
    case "no-change":
      return row.plan.notes[0]
        ? `No change: ${row.plan.notes[0]}`
        : "No change";
    case "confirm":
      return `Waiting for confirmation: ${names(row)}`;
    case "cancelled":
      return "Cancelled. No change";
    case "running":
      return `Adding: ${names(row)}`;
    case "failed": {
      const failed = row.plan.steps.find(
        (_, i) => row.stepStatus[i] === "failed"
      );
      const kept = added ? ` Added: ${added}.` : "";
      return `Failed: ${failed?.title ?? "a step"}.${kept}`;
    }
    case "done":
      return added ? `Added: ${added}` : "No change";
  }
}
