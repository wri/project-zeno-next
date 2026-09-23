type NudgeClickEvent = {
  event: "nudge_click";
  nudge_type:
    | "view_analysis"
    | "generate_insight"
    | "dataset_choice"
    | "create_dashboard"
    | "open_dashboard"
    | "dashboard_chip"
    // Agent (backend) nudge types other than dataset_choice. Ad hoc or empty
    // backend types collapse to agent_other so a GA dimension never receives
    // arbitrary model-chosen strings; the raw type rides in agent_nudge_type.
    | "aoi_choice"
    | "dashboard_choice"
    | "insight_choice"
    | "agent_other";
  dataset_name?: string;
  area_name?: string;
  dataset_id?: number;
  chip_text?: string;
  agent_nudge_type?: string;
  option_index?: number;
  option_text?: string;
};

export type { NudgeClickEvent };

type TrackableEvent = NudgeClickEvent;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function trackEvent(payload: TrackableEvent) {
  window.dataLayer?.push(payload);
}
