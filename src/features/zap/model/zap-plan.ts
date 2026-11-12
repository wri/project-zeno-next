import type { AOI, AOISelection, DatasetInfo } from "@/app/types/chat";

/** The area the backend found, as `POST /api/zap` returns it. */
export interface ZapArea {
  name: string;
  source: string;
  src_id: string;
  subtype?: string | null;
  bbox?: [number, number, number, number] | null;
}

export interface ZapAnalysisArgs {
  dataset_id: number;
  dataset_name: string;
  area: ZapArea;
  start_date: string;
  end_date: string;
  context_layer?: string | null;
  canopy_cover?: number | null;
}

/** A step of a map plan. */
export type ZapMapStep =
  | { kind: "dataset"; title: string; detail: string; args: DatasetInfo }
  | { kind: "area"; title: string; detail: string; args: ZapArea }
  | { kind: "analysis"; title: string; detail: string; args: ZapAnalysisArgs };

/** The body of `POST /api/dashboards/{id}/widgets`, as the planner gives it. */
export interface ZapWidgetBody {
  widget_type: "insight" | "map";
  insight_id?: string | null;
  config: Record<string, unknown>;
}

/** `add_chart`: run `analyze`, then add `widget` with the insight of the job. */
export interface ZapAddChartArgs {
  dashboard_id: string;
  dataset_name: string;
  analyze: {
    aois: { source: string; src_id: string; subtype: string }[];
    dataset_id: number;
    start_date: string;
    end_date: string;
    context_layer?: string | null;
    canopy_cover?: number | null;
  };
  widget: ZapWidgetBody;
}

/** `add_map`: add `widget`; its config holds the map layer snapshot. */
export interface ZapAddMapArgs {
  dashboard_id: string;
  dataset_name: string;
  widget: ZapWidgetBody;
}

/** `add_template`: add a section from the analysis template `template`. */
export interface ZapAddTemplateArgs {
  dashboard_id: string;
  template: string;
  args: Record<string, unknown>;
}

/** `add_imagery`: build the mosaic, then add `widget` with its statistics. */
export interface ZapAddImageryArgs {
  dashboard_id: string;
  mosaic: {
    source: string;
    src_id: string;
    target_date: string;
    window_days: number;
    max_cloud_cover: number;
    max_items: number;
  };
  widget: ZapWidgetBody;
}

/** `add_section`: add the empty section `section` (it has a `title`). */
export interface ZapAddSectionArgs {
  dashboard_id: string;
  section: { title: string } & Record<string, unknown>;
}

/**
 * `move`: send `patch` to the widget. `patch.section_id` is null for the top
 * level, and the null must stay in the body.
 */
export interface ZapMoveArgs {
  dashboard_id: string;
  widget_id: string;
  widget_label: string;
  destination_label: string;
  patch: { section_id: string | null } & Record<string, unknown>;
}

/** `resize`: send `patch` (the full config with the new `size`) to the widget. */
export interface ZapResizeArgs {
  dashboard_id: string;
  widget_id: string;
  widget_label: string;
  size: "single" | "double";
  patch: { config: Record<string, unknown> } & Record<string, unknown>;
}

/** `rename`: send `patch` to the dashboard or to the section `section_id`. */
export interface ZapRenameArgs {
  dashboard_id: string;
  target_type: "dashboard" | "section";
  section_id?: string | null;
  old_title: string;
  title: string;
  patch: Record<string, unknown>;
}

/** The body of a new widget at the position and in the section of an old one. */
export interface ZapPlacedWidgetBody extends ZapWidgetBody {
  position?: number | null;
  section_id?: string | null;
}

/**
 * `change_period`: run `analyze` (a chart; null for a map), add `widget` at
 * the place of the old widget, then remove the old widget if `replace`.
 */
export interface ZapChangePeriodArgs {
  dashboard_id: string;
  widget_id: string;
  widget_label: string;
  dataset_name: string;
  old_start_date?: string | null;
  old_end_date?: string | null;
  replace?: boolean;
  analyze?: ZapAddChartArgs["analyze"] | null;
  widget: ZapPlacedWidgetBody;
}

/** `remove`: a widget, or a section with or without its widgets. */
export interface ZapRemoveArgs {
  dashboard_id: string;
  target_type: "widget" | "section";
  widget_id?: string | null;
  section_id?: string | null;
  label: string;
  delete_widgets?: boolean;
  widget_labels?: string[];
}

type Step<K extends string, A> = {
  kind: K;
  title: string;
  detail: string;
  args: A;
};

/** A step of a dashboard plan: an addition or an edit. */
export type ZapDashboardStep =
  | Step<"add_chart", ZapAddChartArgs>
  | Step<"add_map", ZapAddMapArgs>
  | Step<"add_template", ZapAddTemplateArgs>
  | Step<"add_imagery", ZapAddImageryArgs>
  | Step<"add_section", ZapAddSectionArgs>
  | Step<"move", ZapMoveArgs>
  | Step<"resize", ZapResizeArgs>
  | Step<"rename", ZapRenameArgs>
  | Step<"change_period", ZapChangePeriodArgs>
  | Step<"remove", ZapRemoveArgs>;

/** The step kinds that cannot be taken back, so they always wait for a confirmation. */
export const isDestructiveStep = (step: ZapStep): boolean =>
  step.kind === "remove" || step.kind === "change_period";

/** One step of a plan. The client runs the steps in order. */
export type ZapStep = ZapMapStep | ZapDashboardStep;

export const isMapStep = (step: ZapStep): step is ZapMapStep =>
  step.kind === "dataset" || step.kind === "area" || step.kind === "analysis";

/** The path that gave the value of a decision. */
export type ZapDecisionSource = "jev" | "clairic" | "code" | "user";

/**
 * An other option of a decision. With a `value` (a dashboard edit), selecting
 * it sends the same prompt again with `choose: { [decision.key]: value }`.
 * Without a `value`, selecting it sends `label` as a new request.
 */
export interface ZapDecisionOption {
  label: string;
  probability: number;
  /** The option id, e.g. "widget:<id>". Absent before phase 5. */
  value?: string | null;
}

/** One answer of the planner, shown under the plan. */
export interface ZapDecision {
  question: string;
  label: string;
  probability: number;
  /** Sent by the phase 2 backend; absent on older backends. */
  source?: ZapDecisionSource | null;
  /** The other top options, best first. Absent on older backends. */
  options?: ZapDecisionOption[] | null;
  /** False when the planner is not sure of the value. Absent on older backends. */
  clear?: boolean | null;
  /** The decision key for `choose`, e.g. "target". Absent before phase 5. */
  key?: string | null;
  /** The id of the selected option. Absent before phase 5. */
  value?: string | null;
}

/** The options that the user selected, as `{ decision key: option value }`. */
export type ZapChoose = Record<string, string>;

/**
 * The state that the planner starts from. The older backend reads only
 * `dataset_id` and `area` and ignores the other fields. `page` selects the
 * planner: absent or "map" for the map, "dashboard" for `dashboard_id`.
 */
export interface ZapCurrent {
  dataset_id?: number | null;
  area?: ZapArea | null;
  start_date?: string | null;
  end_date?: string | null;
  context_layer?: string | null;
  canopy_cover?: number | null;
  page?: "map" | "dashboard" | null;
  dashboard_id?: string | null;
  /** The widgets that the last edit on this dashboard added or changed. */
  last_widget_ids?: string[] | null;
  /** The sections that the last edit on this dashboard added or changed. */
  last_section_ids?: string[] | null;
}

export interface ZapPlan {
  steps: ZapStep[];
  decisions: ZapDecision[];
  notes: string[];
  /** The state after the steps. Absent on older backends. */
  state?: ZapCurrent | null;
  /** 0: map, 1: dashboard addition, 2: needs a confirmation. Absent on older backends. */
  tier?: number | null;
  /** True when the steps must run only after the user confirms the plan. */
  needs_confirmation?: boolean | null;
}

export type ZapStepStatus =
  | "pending"
  | "running"
  | "done"
  | "skipped"
  | "failed";

/**
 * A map layer as the trail stores it. Only `ui/map-view.ts` writes and reads
 * the other fields, so the model keeps the type open.
 */
export interface ZapMapLayer {
  readonly id: string;
}

/** What is necessary to put the map back in one state. */
export interface ZapMapView {
  /** Copies of the dataset layers and of the area layers with no geometry. */
  layers: ZapMapLayer[];
  /** The area selections, with no geometry. A restore gets it again. */
  areas: AOISelection[];
}

export function toAoi(area: ZapArea): AOI {
  return {
    name: area.name,
    source: area.source,
    src_id: area.src_id,
    subtype: area.subtype ?? "",
    bbox: area.bbox ?? undefined,
  };
}

function canopyOf(dataset: DatasetInfo): number | null {
  const value = dataset.parameters?.find((p) => p.name === "canopy_cover")
    ?.values?.[0];
  return typeof value === "number" ? value : null;
}

/**
 * The map state after a plan. The phase 2 backend sends it as `plan.state`.
 * An older backend does not, so it is made from `current` and the steps.
 */
export function stateAfter(current: ZapCurrent, plan: ZapPlan): ZapCurrent {
  if (plan.state) return plan.state;
  let next: ZapCurrent = { ...current };
  for (const step of plan.steps) {
    if (!isMapStep(step)) continue;
    if (step.kind === "area") {
      next = { ...next, area: step.args };
      continue;
    }
    const { args } = step;
    next = {
      ...next,
      dataset_id: args.dataset_id,
      start_date: args.start_date ?? null,
      end_date: args.end_date ?? null,
      context_layer: args.context_layer ?? null,
      canopy_cover:
        step.kind === "dataset"
          ? canopyOf(step.args)
          : (step.args.canopy_cover ?? null),
      ...(step.kind === "analysis" ? { area: step.args.area } : {}),
    };
  }
  return next;
}
