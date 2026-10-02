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

// Front door (NEXT_PUBLIC_FRONT_DOOR): consent on /welcome, then the profile
// asked for in the chat.
type FrontDoorEvent =
  | {
      event: "welcome_terms_accepted";
      terms_version: string;
      /** Arrived with a ?prompt= waiting to run. */
      has_prompt: boolean;
      /** The backend found a GFW profile for the account. */
      gfw_account: boolean;
    }
  | {
      event: "profile_card_shown";
      trigger: "first_answer" | "banner";
      /** Prefilled from a GFW profile. */
      prefilled: boolean;
    }
  | { event: "profile_card_saved"; prefilled: boolean }
  | { event: "profile_card_dismissed"; surface: "card" | "banner" };

type TrackableEvent = NudgeClickEvent | FrontDoorEvent;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function trackEvent(payload: TrackableEvent) {
  window.dataLayer?.push(payload);
}
