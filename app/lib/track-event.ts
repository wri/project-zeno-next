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
      /** The tour's content version (0 if it declares none). */
      tour_version: number;
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
      /**
       * "user": pressed Skip step. "tour": passed over without being done,
       * including steps never shown (one event per step).
       */
      skipped_by: "user" | "tour";
      /** 0 for a step passed over as it opened. */
      ms_on_step: number;
    }
  | {
      event: "tour_ended";
      tour_id: string;
      tour_version: number;
      /** "abandoned": stopped with no outcome (overlay gone, route changed). */
      outcome: "completed" | "closed" | "abandoned";
      /** The step the tour ended on; the last step when it ran to the end. */
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
