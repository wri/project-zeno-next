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

// Front door: consent on /welcome, then the profile asked for in the chat.
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
  | {
      event: "profile_card_saved";
      prefilled: boolean;
      /** Ticked the email list opt-in on the card. */
      news_emails: boolean;
    }
  | { event: "profile_card_dismissed"; surface: "card" | "banner" };

/**
 * Onboarding tours (behind ?ff=onboarding). Every value is a fixed id from the
 * tour definitions ("first-run", "checklist-ask", step and anchor ids), never
 * user text. `step_number` counts from 1, as the popover does.
 */
export type OnboardingTourEvent =
  | {
      event: "tour_started";
      tour_id: string;
      step_count: number;
      /** The user had not finished or skipped the first-run tour before. */
      first_visit: boolean;
    }
  | {
      event: "tour_step_viewed";
      tour_id: string;
      step_id: string;
      step_number: number;
      step_count: number;
    }
  | {
      event: "tour_step_skipped";
      tour_id: string;
      step_id: string;
      step_number: number;
      /** "user": left an action step without doing it; "tour": passed over automatically. */
      skipped_by: "user" | "tour";
      ms_on_step: number;
    }
  | {
      event: "tour_ended";
      tour_id: string;
      outcome: "completed" | "closed";
      /** The step the tour ended on. */
      step_id: string;
      step_number: number;
      step_count: number;
    }
  | {
      /** A step was left while no visible element carried its anchor. */
      event: "tour_target_missing";
      tour_id: string;
      step_id: string;
      anchor_id: string;
      optional: boolean;
      ms_on_step: number;
    };

type TrackableEvent = NudgeClickEvent | FrontDoorEvent | OnboardingTourEvent;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function trackEvent(payload: TrackableEvent) {
  window.dataLayer?.push(payload);
}
