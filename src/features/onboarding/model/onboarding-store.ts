import { create } from "zustand";

import {
  EMPTY_PROGRESS,
  type ChecklistItemId,
  type ChecklistTickedBy,
  type OnboardingProgress,
  type TourOutcome,
} from "./onboarding-progress";
import { passesOverAtEntry } from "./step-policy";
import type { Tour, TourStep } from "./tour";

/** How a tour ended: finished, closed by the user, or stopped with no outcome. */
export type TourEnd = "completed" | "closed" | "abandoned";

/**
 * Onboarding state: the running tour (if any) and the checklist.
 *
 * Persistence is not done here (the model stays storage-agnostic): the ui
 * layer hydrates `progress` on mount and writes it back on change.
 */
export interface OnboardingState {
  tour: Tour<unknown> | null;
  stepIndex: number;
  /** Steps the user was shown, for Back. Steps skipped automatically aren't. */
  history: readonly number[];
  checklistExpanded: boolean;
  progress: OnboardingProgress;
  hydrated: boolean;
  /**
   * A tour stopped without an outcome in this page session (see
   * `abandonTour`). In memory only: a reload forgets it.
   */
  tourAbandoned: boolean;
  /** How the last tour ended, for telemetry; null before any has. */
  lastTourEnd: TourEnd | null;
  /** Times the user pressed Skip step, for telemetry (each is one skip). */
  userSkips: number;
  /** How the latest checklist tick was made, for telemetry. */
  lastTickedBy: ChecklistTickedBy | null;

  hydrate: (progress: OnboardingProgress) => void;
  startTour: (tour: Tour<unknown>) => void;
  /**
   * Go to the next step (or finish on the last), passing over steps that
   * have nothing to show (`passesOverAtEntry`). `skipped` marks the current
   * step as passed over automatically, so Back won't return to it. `from` is
   * the step the caller saw: a late timer or a double click from an earlier
   * step is ignored.
   */
  advance: (skipped?: boolean, from?: number) => void;
  /** The user pressed Skip step on step `from`: run its `onSkip`, then go on. */
  skipStep: (from: number) => void;
  /** Return to the last step the user was shown. */
  back: () => void;
  /** Close the running tour and run its `onEnd` (which records any outcome). */
  endTour: (completed: boolean) => void;
  /**
   * Stop the running tour without an outcome (no `onEnd`): it was neither
   * finished nor dismissed, e.g. its overlay went away or the route changed.
   */
  abandonTour: () => void;
  /**
   * Record the first-run outcome. It ticks nothing: the checklist's tasks are
   * ones the tour doesn't teach. It brings back a hidden checklist, so taking
   * the tour again (even skipping it) is the way back to it.
   */
  recordTourOutcome: (outcome: TourOutcome) => void;
  markChecklistDone: (
    ids: readonly ChecklistItemId[],
    by: ChecklistTickedBy
  ) => void;
  setChecklistExpanded: (expanded: boolean) => void;
  dismissChecklist: () => void;
}

const mergeDone = (
  done: readonly ChecklistItemId[],
  ids: readonly ChecklistItemId[]
): readonly ChecklistItemId[] => {
  const merged = [...new Set([...done, ...ids])];
  return merged.length === done.length ? done : merged;
};

/**
 * Enter steps from `index` on, running each `onEnter`, and return the first
 * one to show (`steps.length` when none is left). Deciding here, not in the
 * overlay, means a passed-over step never renders and React can't run the
 * decision twice (StrictMode runs effects twice in development).
 */
function enterFrom(steps: readonly TourStep<unknown>[], index: number): number {
  let i = index;
  while (i < steps.length) {
    steps[i].onEnter?.();
    if (!passesOverAtEntry(steps[i])) return i;
    i++;
  }
  return i;
}

const useOnboardingStore = create<OnboardingState>((set, get) => ({
  tour: null,
  stepIndex: 0,
  history: [],
  checklistExpanded: true,
  progress: EMPTY_PROGRESS,
  hydrated: false,
  tourAbandoned: false,
  lastTourEnd: null,
  userSkips: 0,
  lastTickedBy: null,

  hydrate: (progress) => set({ progress, hydrated: true }),

  // A step's `onEnter` runs here, before it renders, so the overlay's first
  // look at the step already sees the state the set-up produced.
  startTour: (tour) => {
    const stepIndex = enterFrom(tour.steps, 0);
    set({ tour, stepIndex, history: [] });
    if (stepIndex >= tour.steps.length) get().endTour(true);
  },

  advance: (skipped = false, from) => {
    const { tour, stepIndex, history } = get();
    if (!tour || (from !== undefined && from !== stepIndex)) return;
    const next = enterFrom(tour.steps, stepIndex + 1);
    set({
      stepIndex: next,
      history: skipped ? history : [...history, stepIndex],
    });
    // Past the last step, as in `startTour`: the move is recorded first, so
    // telemetry sees which steps were passed over on the way out.
    if (next >= tour.steps.length) get().endTour(true);
  },

  skipStep: (from) => {
    const { tour, stepIndex } = get();
    if (!tour || from !== stepIndex) return;
    tour.steps[stepIndex].onSkip?.();
    // Its own update, before the move: Skip step otherwise advances like Next.
    set((state) => ({ userSkips: state.userSkips + 1 }));
    get().advance(false, from);
  },

  back: () => {
    const { tour, history } = get();
    const previous = history.at(-1);
    if (!tour || previous === undefined) return;
    tour.steps[previous].onEnter?.();
    set({ stepIndex: previous, history: history.slice(0, -1) });
  },

  endTour: (completed) => {
    const { tour } = get();
    if (!tour) return;
    set({
      tour: null,
      stepIndex: 0,
      history: [],
      lastTourEnd: completed ? "completed" : "closed",
    });
    tour.onEnd?.(completed);
  },

  abandonTour: () => {
    if (!get().tour) return;
    set({
      tour: null,
      stepIndex: 0,
      history: [],
      tourAbandoned: true,
      lastTourEnd: "abandoned",
    });
  },

  recordTourOutcome: (outcome) =>
    set((state) => ({
      progress: {
        ...state.progress,
        tourOutcome: outcome,
        checklistDismissed: false,
      },
    })),

  markChecklistDone: (ids, by) =>
    set((state) => {
      const checklistDone = mergeDone(state.progress.checklistDone, ids);
      return checklistDone === state.progress.checklistDone
        ? state
        : {
            progress: { ...state.progress, checklistDone },
            lastTickedBy: by,
          };
    }),

  setChecklistExpanded: (expanded) => set({ checklistExpanded: expanded }),

  dismissChecklist: () =>
    set((state) => ({
      progress: { ...state.progress, checklistDismissed: true },
    })),
}));

/** A tour (the first-run tour or a checklist walkthrough) is running. */
export const selectTourActive = (state: OnboardingState): boolean =>
  state.tour !== null;

export default useOnboardingStore;
