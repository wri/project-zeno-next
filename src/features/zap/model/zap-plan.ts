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

/** One step of a plan. The client runs the steps in order. */
export type ZapStep =
  | { kind: "dataset"; title: string; detail: string; args: DatasetInfo }
  | { kind: "area"; title: string; detail: string; args: ZapArea }
  | { kind: "analysis"; title: string; detail: string; args: ZapAnalysisArgs };

/** The path that gave the value of a decision. */
export type ZapDecisionSource = "jev" | "clairic" | "code";

/**
 * An other option of a decision. The backend does not send options yet.
 * Selecting one sends `label` as a new request on the current state.
 */
export interface ZapDecisionOption {
  label: string;
  probability: number;
}

/** One answer of the planner, shown under the plan. */
export interface ZapDecision {
  question: string;
  label: string;
  probability: number;
  /** Sent by the phase 2 backend; absent on older backends. */
  source?: ZapDecisionSource | null;
  /** The other top options, best first. Absent until the backend sends them. */
  options?: ZapDecisionOption[] | null;
}

/**
 * The map state that the planner starts from. The older backend reads only
 * `dataset_id` and `area` and ignores the other fields.
 */
export interface ZapCurrent {
  dataset_id?: number | null;
  area?: ZapArea | null;
  start_date?: string | null;
  end_date?: string | null;
  context_layer?: string | null;
  canopy_cover?: number | null;
}

export interface ZapPlan {
  steps: ZapStep[];
  decisions: ZapDecision[];
  notes: string[];
  /** The map state after the steps. Absent on older backends. */
  state?: ZapCurrent | null;
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
