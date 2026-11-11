/**
 * Tour telemetry as a pure function of two onboarding-store states: the
 * events one store change implies. The ui hook (`useTourTelemetry`) feeds it
 * every change and sends the result to the dataLayer. Its only reads outside
 * the two states are the injected `anchorShown` and the step definitions.
 */
import type { OnboardingTourEvent } from "@/app/lib/track-event";
import type { TourAnchorId } from "@/src/shared/lib/tour-anchors";

import type { OnboardingState } from "../model/onboarding-store";
import type { Tour } from "../model/tour";

/** The store fields telemetry reads. */
export type TourTelemetryState = Pick<
  OnboardingState,
  | "tour"
  | "stepIndex"
  | "history"
  | "lastTourEnd"
  | "userSkips"
  | "progress"
  | "hydrated"
  | "lastTickedBy"
>;

export interface TourTelemetryProbe {
  /** A visible element carries this anchor now. */
  readonly anchorShown: (id: TourAnchorId) => boolean;
  /** How long the current (or just left) step has been the current one, ms. */
  readonly msOnStep: number;
}

type TourEndOutcome = Extract<
  OnboardingTourEvent,
  { event: "tour_ended" }
>["outcome"];

/** The user pressed Skip step: the store counts it before the move. */
export const userSkipped = (
  prev: TourTelemetryState,
  next: TourTelemetryState
): boolean => next.userSkips !== prev.userSkips;

/**
 * The step left by a forward move was passed over by the tour (not done, not
 * skipped by the user): the store keeps such steps out of `history`.
 */
export const leftStepPassedOver = (
  prev: TourTelemetryState,
  next: TourTelemetryState
): boolean => next.history.length === prev.history.length;

/** How the tour that just closed ended. */
export function endOutcome(next: TourTelemetryState): TourEndOutcome {
  // Replaced by another tour, or ended without a recorded end: no outcome.
  if (next.tour !== null) return "abandoned";
  return next.lastTourEnd ?? "abandoned";
}

/** Steps `from` to `to` (exclusive), each passed over without being shown. */
function passedOver(
  tour: Tour<unknown>,
  from: number,
  to: number
): OnboardingTourEvent[] {
  const events: OnboardingTourEvent[] = [];
  for (let i = from; i < Math.min(to, tour.steps.length); i++)
    events.push({
      event: "tour_step_skipped",
      tour_id: tour.id,
      step_id: tour.steps[i].id,
      step_number: i + 1,
      skipped_by: "tour",
      ms_on_step: 0,
    });
  return events;
}

/**
 * Checklist items ticked by this change. Loading stored progress is not a
 * tick: those were reported when they happened.
 */
function checklistTicks(
  prev: TourTelemetryState,
  next: TourTelemetryState
): OnboardingTourEvent[] {
  if (
    !prev.hydrated ||
    next.progress.checklistDone === prev.progress.checklistDone
  )
    return [];
  const before = new Set(prev.progress.checklistDone);
  return next.progress.checklistDone
    .filter((id) => !before.has(id))
    .map((id) => ({
      event: "checklist_item_done",
      item_id: id,
      ticked_by: next.lastTickedBy ?? "detected",
    }));
}

/**
 * The telemetry events for one store change, in the order they happened.
 * One store change can pass over several steps (and `startTour` or the last
 * `advance` can end the tour too): each step passed over gets its own
 * `tour_step_skipped`, so a funnel shows the steps users never see.
 */
export function tourTelemetryEvents(
  prev: TourTelemetryState,
  next: TourTelemetryState,
  probe: TourTelemetryProbe
): OnboardingTourEvent[] {
  const events: OnboardingTourEvent[] = checklistTicks(prev, next);

  // Skip step: its own store change, made while the step is still current.
  const current = next.tour?.steps[next.stepIndex];
  if (next.tour && current && userSkipped(prev, next))
    events.push({
      event: "tour_step_skipped",
      tour_id: next.tour.id,
      step_id: current.id,
      step_number: next.stepIndex + 1,
      skipped_by: "user",
      ms_on_step: probe.msOnStep,
    });

  const tourChanged = prev.tour !== next.tour;
  if (!tourChanged && prev.stepIndex === next.stepIndex) return events;

  const left = prev.tour?.steps[prev.stepIndex];
  if (prev.tour && left) {
    if (left.target?.kind === "selector" && !probe.anchorShown(left.target.id))
      events.push({
        event: "tour_target_missing",
        tour_id: prev.tour.id,
        step_id: left.id,
        anchor_id: left.target.id,
        optional: !!left.optional,
        ms_on_step: probe.msOnStep,
      });
    const forward = !tourChanged && next.stepIndex > prev.stepIndex;
    if (forward && leftStepPassedOver(prev, next))
      events.push({
        event: "tour_step_skipped",
        tour_id: prev.tour.id,
        step_id: left.id,
        step_number: prev.stepIndex + 1,
        skipped_by: "tour",
        ms_on_step: probe.msOnStep,
      });
    if (forward)
      events.push(...passedOver(prev.tour, prev.stepIndex + 1, next.stepIndex));
  }

  if (prev.tour && tourChanged) {
    // A tour run to the end stops past its last step: report that one.
    const at = Math.min(prev.stepIndex, prev.tour.steps.length - 1);
    events.push({
      event: "tour_ended",
      tour_id: prev.tour.id,
      tour_version: prev.tour.version,
      outcome: endOutcome(next),
      step_id: prev.tour.steps[at]?.id ?? "none",
      step_number: at + 1,
      step_count: prev.tour.steps.length,
    });
  }

  if (next.tour && tourChanged) {
    events.push({
      event: "tour_started",
      tour_id: next.tour.id,
      tour_version: next.tour.version,
      step_count: next.tour.steps.length,
      first_visit: next.progress.tourOutcome === null,
    });
    events.push(...passedOver(next.tour, 0, next.stepIndex));
  }

  if (next.tour && current)
    events.push({
      event: "tour_step_viewed",
      tour_id: next.tour.id,
      step_id: current.id,
      step_number: next.stepIndex + 1,
      step_count: next.tour.steps.length,
    });
  return events;
}
