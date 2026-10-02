import type { AOI, DatasetInfo } from "@/app/types/chat";

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

/** One jev answer, shown under the plan. */
export interface ZapDecision {
  question: string;
  label: string;
  probability: number;
}

export interface ZapPlan {
  steps: ZapStep[];
  decisions: ZapDecision[];
  notes: string[];
}

/** What the map shows now, so jev can keep it. */
export interface ZapCurrent {
  dataset_id?: number;
  area?: ZapArea;
}

export type ZapStepStatus =
  | "pending"
  | "running"
  | "done"
  | "skipped"
  | "failed";

export function toAoi(area: ZapArea): AOI {
  return {
    name: area.name,
    source: area.source,
    src_id: area.src_id,
    subtype: area.subtype ?? "",
    bbox: area.bbox ?? undefined,
  };
}
