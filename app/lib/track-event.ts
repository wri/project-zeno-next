type NudgeClickEvent = {
  event: "nudge_click";
  nudge_type:
    | "view_analysis"
    | "generate_insight"
    | "dataset_choice"
    | "create_dashboard"
    | "open_dashboard"
    | "dashboard_chip";
  dataset_name?: string;
  area_name?: string;
  dataset_id?: number;
  chip_text?: string;
};

type TrackableEvent = NudgeClickEvent;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function trackEvent(payload: TrackableEvent) {
  window.dataLayer?.push(payload);
}
