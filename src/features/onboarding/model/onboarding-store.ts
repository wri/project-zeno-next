import { create } from "zustand";

import {
  EMPTY_PROGRESS,
  type ChecklistItemId,
  type OnboardingProgress,
  type TourOutcome,
} from "./onboarding-progress";
import type { Tour } from "./tour";

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

  hydrate: (progress: OnboardingProgress) => void;
  startTour: (tour: Tour<unknown>) => void;
  /**
   * Go to the next step (or finish on the last). `skipped` marks the current
   * step as passed over automatically, so Back won't return to it.
   */
  advance: (skipped?: boolean) => void;
  /** Return to the last step the user was shown. */
  back: () => void;
  /** Close the running tour and run its `onEnd` (which records any outcome). */
  endTour: (completed: boolean) => void;
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

const useOnboardingStore = create<OnboardingState>((set, get) => ({
  tour: null,
  stepIndex: 0,
  history: [],
  draftPrompt: null,
  checklistExpanded: true,
  progress: EMPTY_PROGRESS,
  hydrated: false,

  hydrate: (progress) => set({ progress, hydrated: true }),

  // A step's `onEnter` runs here, before it renders, so the overlay's first
  // look at the step already sees the state the set-up produced.
  startTour: (tour) => {
    tour.steps[0]?.onEnter?.();
    set({ tour, stepIndex: 0, history: [] });
  },

  advance: (skipped = false) => {
    const { tour, stepIndex, history } = get();
    if (!tour) return;
    const next = stepIndex + 1;
    if (next >= tour.steps.length) return get().endTour(true);
    tour.steps[next].onEnter?.();
    set({
      stepIndex: next,
      history: skipped ? history : [...history, stepIndex],
    });
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
    set({ tour: null, stepIndex: 0, history: [] });
    tour.onEnd?.(completed);
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

export default useOnboardingStore;
