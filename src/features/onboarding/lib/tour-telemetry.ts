/**
 * Tour telemetry as a pure function of two onboarding-store states: the
 * events one store change implies. The ui hook (`useTourTelemetry`) feeds it
 * every change and sends the result to the dataLayer. Its only reads outside
 * the two states are the injected `anchorShown` and the left step's own
 * `waitFor`.
 */
import type { OnboardingTourEvent } from "@/app/lib/track-event";
import type { TourAnchorId } from "@/src/shared/lib/tour-anchors";

import type { OnboardingState } from "../model/onboarding-store";
import type { TourStep } from "../model/tour";

/** The store fields telemetry reads. */
export type TourTelemetryState = Pick<
  OnboardingState,
  "tour" | "stepIndex" | "history" | "lastTourCompleted" | "progress"
>;

export interface TourTelemetryProbe {
  /** A visible element carries this anchor now. */
  readonly anchorShown: (id: TourAnchorId) => boolean;
  /** How long the step being left was the current one, ms. */
  readonly msOnStep: number;
}

/**
 * Who passed over the step being left forward, or null if it wasn't skipped.
 * The store keeps automatic skips out of `history`. A user's "Skip step"
 * advances like Next, so it is inferred: an action step left while its action
 * is still undone. (The next step's `onEnter` has run by now; none undoes the
 * previous step's action today.)
 */
export function skippedBy(
  prev: TourTelemetryState,
  next: TourTelemetryState,
  left: TourStep<unknown>
): "user" | "tour" | null {
  if (next.stepIndex <= prev.stepIndex) return null;
  if (next.history.length === prev.history.length) return "tour";
  return left.waitFor && !left.waitFor() ? "user" : null;
}

/** How the tour that just closed ended. */
export function endOutcome(
  next: TourTelemetryState
): Extract<OnboardingTourEvent, { event: "tour_ended" }>["outcome"] {
  // Another tour replacing it never reached `endTour`.
  if (next.tour !== null) return "closed";
  return next.lastTourCompleted ? "completed" : "closed";
}

/** The telemetry events for one store change, in the order they happened. */
export function tourTelemetryEvents(
  prev: TourTelemetryState,
  next: TourTelemetryState,
  probe: TourTelemetryProbe
): OnboardingTourEvent[] {
  const tourChanged = prev.tour !== next.tour;
  if (!tourChanged && prev.stepIndex === next.stepIndex) return [];
  const events: OnboardingTourEvent[] = [];

  const left = prev.tour?.steps[prev.stepIndex];
  if (prev.tour && left) {
    const step = {
      tour_id: prev.tour.id,
      step_id: left.id,
    };
    if (left.target?.kind === "selector" && !probe.anchorShown(left.target.id))
      events.push({
        event: "tour_target_missing",
        ...step,
        anchor_id: left.target.id,
        optional: !!left.optional,
        ms_on_step: probe.msOnStep,
      });
    if (tourChanged) {
      events.push({
        event: "tour_ended",
        ...step,
        outcome: endOutcome(next),
        step_number: prev.stepIndex + 1,
        step_count: prev.tour.steps.length,
      });
    } else {
      const by = skippedBy(prev, next, left);
      if (by)
        events.push({
          event: "tour_step_skipped",
          ...step,
          step_number: prev.stepIndex + 1,
          skipped_by: by,
          ms_on_step: probe.msOnStep,
        });
    }
  }

  const entered = next.tour?.steps[next.stepIndex];
  if (next.tour && entered) {
    if (tourChanged)
      events.push({
        event: "tour_started",
        tour_id: next.tour.id,
        step_count: next.tour.steps.length,
        first_visit: next.progress.tourOutcome === null,
      });
    events.push({
      event: "tour_step_viewed",
      tour_id: next.tour.id,
      step_id: entered.id,
      step_number: next.stepIndex + 1,
      step_count: next.tour.steps.length,
    });
  }
  return events;
}
