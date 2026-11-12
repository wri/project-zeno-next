import {
  isMapStep,
  type ZapChoose,
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

/** The ids of the widgets and the sections that a request added or changed. */
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
  /** The `current` that the request sent. A chip sends it again. */
  before: ZapCurrent;
  /** The options that the user selected for this plan, if any. */
  choose?: ZapChoose | null;
  /**
   * The state to send as `current` with the next request. After the steps
   * run, it holds the ids of the edit (`last_widget_ids`, `last_section_ids`).
   */
  state: ZapCurrent;
  stepStatus: ZapStepStatus[];
  outcome: ZapEditOutcome;
  /** The error of the step that failed. */
  error: string | null;
  /** The warnings of the steps, e.g. a template widget that was left out. */
  warnings: string[];
  /** The ids that the steps added or changed. A removal gives no ids. */
  edited: ZapEditIds;
}

/** The trail of one dashboard. `index` is the row that shows its plan. */
export interface ZapDashboardTrail {
  rows: ZapDashboardRow[];
  index: number;
}

export const EMPTY_DASHBOARD_TRAIL: ZapDashboardTrail = { rows: [], index: -1 };

const KEY_PREFIX = "gnw:zap-dashboard-trail:";
// Version 2 (phase 5) adds `before` and `choose`, and renames `added` to
// `edited`. A version 1 trail is dropped.
const TRAIL_VERSION = 2;

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

/** The part of a title after "Verb: ", e.g. the widget of "Move: Map "X"". */
function subject(title: string, fallback: string): string {
  return title.split(": ").slice(1).join(": ") || fallback;
}

/** A period in years, e.g. "2015–2020", or "2020" for one year. */
export function periodText(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  if (!start || !end) return "all years";
  const [from, to] = [start.slice(0, 4), end.slice(0, 4)];
  return from === to ? from : `${from}–${to}`;
}

const WIDTH = { single: "half width", double: "full width" } as const;

/** The new period of a `change_period` step. */
function newPeriod(step: Extract<ZapDashboardStep, { kind: "change_period" }>) {
  const { analyze, widget } = step.args;
  const dataset = widget.config.dataset as
    | { start_date?: string | null; end_date?: string | null }
    | undefined;
  return analyze
    ? periodText(analyze.start_date, analyze.end_date)
    : periodText(dataset?.start_date, dataset?.end_date);
}

/** What a step did, in words, e.g. "Removed: Chart "Tree cover loss"". */
export function doneText(step: ZapDashboardStep): string {
  switch (step.kind) {
    case "add_chart":
      return `Added: ${step.args.dataset_name} chart`;
    case "add_map":
      return `Added: ${step.args.dataset_name} map`;
    case "add_imagery":
      return `Added: Sentinel-2 imagery around ${step.args.mosaic.target_date}`;
    case "add_template":
      return `Added: ${subject(step.title, step.args.template)}`;
    case "add_section":
      return `Added: section "${step.args.section.title}"`;
    case "move":
      return `Moved: ${subject(step.title, step.args.widget_label)} to ${step.args.destination_label}`;
    case "resize":
      return `Resized: ${subject(step.title, step.args.widget_label)} to ${WIDTH[step.args.size]}`;
    case "rename":
      return `Renamed: "${step.args.old_title}" to "${step.args.title}"`;
    case "change_period":
      return `Changed period: ${subject(step.title, step.args.widget_label)} to ${newPeriod(step)}`;
    case "remove":
      return `Removed: ${step.args.label}${
        step.args.target_type === "section" && step.args.delete_widgets
          ? " and its widgets"
          : ""
      }`;
  }
}

/** What a step will do, in words, for a preview, e.g. "Remove: ...". */
export function previewText(step: ZapDashboardStep): string {
  switch (step.kind) {
    case "remove":
      return `Remove: ${step.args.label}`;
    case "change_period":
      return `Change period: ${subject(step.title, step.args.widget_label)} to ${newPeriod(step)}`;
    default:
      return step.title;
  }
}

/** The dashboard steps of a row, with their index. */
function dashboardSteps(
  row: ZapDashboardRow,
  status?: ZapStepStatus
): ZapDashboardStep[] {
  return row.plan.steps.filter(
    (step, i): step is ZapDashboardStep =>
      !isMapStep(step) && (!status || row.stepStatus[i] === status)
  );
}

const joined = (
  steps: ZapDashboardStep[],
  text: (s: ZapDashboardStep) => string
) => steps.map(text).join("; ");

/** The edit of a row in one line, for the trail. */
export function editSummary(row: ZapDashboardRow): string {
  const done = joined(dashboardSteps(row, "done"), doneText);
  switch (row.outcome) {
    case "no-change":
      return row.plan.notes[0]
        ? `No change: ${row.plan.notes[0]}`
        : "No change";
    case "confirm":
      return `Waiting for confirmation: ${joined(dashboardSteps(row), previewText)}`;
    case "cancelled":
      return "Cancelled. No change";
    case "running":
      return `Running: ${joined(dashboardSteps(row), previewText)}`;
    case "failed": {
      const failed = row.plan.steps.find(
        (_, i) => row.stepStatus[i] === "failed"
      );
      const kept = done ? ` ${done}.` : "";
      return `Failed: ${failed?.title ?? "a step"}.${kept}`;
    }
    case "done":
      return done || "No change";
  }
}
