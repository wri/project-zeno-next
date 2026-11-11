import { create } from "zustand";

import {
  EMPTY_PROGRESS,
  type ChecklistItemId,
  type OnboardingProgress,
  type TourOutcome,
} from "./onboarding-progress";
import { passesOverAtEntry } from "./step-policy";
import type { Tour, TourStep } from "./tour";

/**
 * Onboarding state: the running tour (if any), the checklist, and a one-shot
 * draft prompt the tour hands to the chat input.
 *
 * Persistence is not done here (the model stays storage-agnostic): the ui
 * layer hydrates `progress` on mount and writes it back on change.
 */
export interface OnboardingState {
  tour: Tour<unknown> | null;
  stepIndex: number;
  /** Steps the user was shown, for Back. Steps skipped automatically aren't. */
  history: readonly number[];
  /** Text for the chat input to adopt once, then clear via `consumeDraftPrompt`. */
  draftPrompt: string | null;
  checklistExpanded: boolean;
  progress: OnboardingProgress;
  hydrated: boolean;
  /**
   * A tour stopped without an outcome in this page session (see
   * `abandonTour`). In memory only: a reload forgets it.
   */
  tourAbandoned: boolean;
  /** How the last tour ended (true: finished), for telemetry; null before any. */
  lastTourCompleted: boolean | null;

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
  /** Record the first-run outcome and tick off the items it covered, in one write. */
  recordTourOutcome: (
    outcome: TourOutcome,
    covered?: readonly ChecklistItemId[]
  ) => void;
  setDraftPrompt: (text: string) => void;
  consumeDraftPrompt: () => string | null;
  markChecklistDone: (ids: readonly ChecklistItemId[]) => void;
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
  draftPrompt: null,
  checklistExpanded: true,
  progress: EMPTY_PROGRESS,
  hydrated: false,
  tourAbandoned: false,
  lastTourCompleted: null,

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
    if (next >= tour.steps.length) return get().endTour(true);
    set({
      stepIndex: next,
      history: skipped ? history : [...history, stepIndex],
    });
  },

  skipStep: (from) => {
    const { tour, stepIndex } = get();
    if (!tour || from !== stepIndex) return;
    tour.steps[stepIndex].onSkip?.();
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
      lastTourCompleted: completed,
    });
    tour.onEnd?.(completed);
  },

  abandonTour: () => {
    if (!get().tour) return;
    set({ tour: null, stepIndex: 0, history: [], tourAbandoned: true });
  },

  recordTourOutcome: (outcome, covered = []) =>
    set((state) => ({
      progress: {
        ...state.progress,
        tourOutcome: outcome,
        checklistDone: mergeDone(state.progress.checklistDone, covered),
      },
    })),

  setDraftPrompt: (text) => set({ draftPrompt: text }),

  consumeDraftPrompt: () => {
    const { draftPrompt } = get();
    if (draftPrompt !== null) set({ draftPrompt: null });
    return draftPrompt;
  },

  markChecklistDone: (ids) =>
    set((state) => {
      const checklistDone = mergeDone(state.progress.checklistDone, ids);
      return checklistDone === state.progress.checklistDone
        ? state
        : { progress: { ...state.progress, checklistDone } };
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
