import { beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_PROGRESS } from "../onboarding-progress";
import useOnboardingStore, { selectTourActive } from "../onboarding-store";
import type { Tour } from "../tour";

const step = (id: string) => ({ id, title: id, body: null });
const tour = (onEnd?: (c: boolean) => void): Tour<unknown> => ({
  id: "test",
  steps: [step("a"), step("b"), step("c")],
  onEnd,
});
const state = () => useOnboardingStore.getState();

beforeEach(() => {
  useOnboardingStore.setState({
    tour: null,
    stepIndex: 0,
    history: [],
    draftPrompt: null,
    checklistExpanded: true,
    progress: EMPTY_PROGRESS,
    hydrated: false,
    tourAbandoned: false,
  });
});

describe("onboarding store", () => {
  it("starts a tour at the first step", () => {
    state().startTour(tour());
    expect(state().tour?.id).toBe("test");
    expect(state().stepIndex).toBe(0);
  });

  it("runs a step's onEnter before showing it", () => {
    const onEnterA = vi.fn();
    const onEnterB = vi.fn();
    state().startTour({
      id: "t",
      steps: [
        { ...step("a"), onEnter: onEnterA },
        { ...step("b"), onEnter: onEnterB },
      ],
    });
    expect(onEnterA).toHaveBeenCalledTimes(1);
    state().advance();
    expect(onEnterB).toHaveBeenCalledTimes(1);
  });

  it("goes back to the last step the user saw, not one skipped automatically", () => {
    state().startTour(tour());
    state().advance(true); // "a" passed over automatically
    state().advance(); // "b" shown, now on "c"
    expect(state().stepIndex).toBe(2);
    state().back();
    expect(state().stepIndex).toBe(1);
    state().back(); // nothing before "b" was shown
    expect(state().stepIndex).toBe(1);
  });

  it("finishes the tour when advancing past the last step", () => {
    const onEnd = vi.fn();
    state().startTour(tour(onEnd));
    state().advance();
    state().advance();
    state().advance();
    expect(state().tour).toBeNull();
    expect(onEnd).toHaveBeenCalledWith(true);
  });

  it("ignores navigation when no tour is running", () => {
    state().advance();
    state().back();
    expect(state().stepIndex).toBe(0);
  });

  it("clears the tour and calls onEnd with the completion flag", () => {
    const onEnd = vi.fn();
    state().startTour(tour(onEnd));
    state().endTour(false);
    expect(state().tour).toBeNull();
    expect(onEnd).toHaveBeenCalledWith(false);
  });

  it("hands the draft prompt over exactly once", () => {
    state().setDraftPrompt("hello");
    expect(state().consumeDraftPrompt()).toBe("hello");
    expect(state().consumeDraftPrompt()).toBeNull();
  });

  it("merges checklist items without duplicates", () => {
    state().markChecklistDone(["alerts", "compare"], "detected");
    state().markChecklistDone(["compare", "own-area"], "detected");
    expect(state().progress.checklistDone).toEqual([
      "alerts",
      "compare",
      "own-area",
    ]);
  });

  it("leaves progress untouched when nothing new is done", () => {
    state().markChecklistDone(["alerts"], "detected");
    const before = state().progress;
    state().markChecklistDone(["alerts"], "manual");
    expect(state().progress).toBe(before);
    expect(state().lastTickedBy).toBe("detected");
  });

  it("remembers how the latest tick was made, with the tick", () => {
    const listener = vi.fn();
    const unsubscribe = useOnboardingStore.subscribe(listener);
    state().markChecklistDone(["dashboard-pdf"], "manual");
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(state().lastTickedBy).toBe("manual");
  });

  it("records the outcome, ticking nothing, in one update", () => {
    const listener = vi.fn();
    const unsubscribe = useOnboardingStore.subscribe(listener);
    state().recordTourOutcome("completed");
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(state().progress).toEqual({
      tourOutcome: "completed",
      checklistDone: [],
      checklistDismissed: false,
    });
  });

  it("brings back a hidden checklist when the tour ends, skipped or not", () => {
    for (const outcome of ["completed", "skipped"] as const) {
      state().dismissChecklist();
      state().recordTourOutcome(outcome);
      expect(state().progress.checklistDismissed).toBe(false);
    }
  });

  it("dismisses the checklist", () => {
    state().dismissChecklist();
    expect(state().progress.checklistDismissed).toBe(true);
  });

  it("ignores a move made from a step the tour has already left", () => {
    state().startTour(tour());
    state().advance(true, 0);
    // A late timer, a second click, or StrictMode's second effect run.
    state().advance(true, 0);
    state().advance(false, 0);
    expect(state().stepIndex).toBe(1);
    state().advance(false, 1);
    expect(state().stepIndex).toBe(2);
  });

  it("passes over steps whose skipIf holds, without showing them", () => {
    const onEnterB = vi.fn();
    state().startTour({
      id: "t",
      steps: [
        step("a"),
        { ...step("b"), onEnter: onEnterB, skipIf: () => true },
        step("c"),
      ],
    });
    state().advance(false, 0);
    expect(state().stepIndex).toBe(2);
    // Set-up still runs: skipIf may depend on it.
    expect(onEnterB).toHaveBeenCalledTimes(1);
    state().back();
    expect(state().stepIndex).toBe(0);
  });

  it("passes over a wait on the app that is already done", () => {
    state().startTour({
      id: "t",
      steps: [
        step("a"),
        { ...step("wait"), waitFor: () => true, waitsOnApp: true },
        step("c"),
      ],
    });
    state().advance();
    expect(state().stepIndex).toBe(2);
  });

  it("shows a done wait that asks to be read (autoAdvance false)", () => {
    state().startTour({
      id: "t",
      steps: [
        step("a"),
        {
          ...step("read"),
          waitFor: () => true,
          waitsOnApp: true,
          autoAdvance: false,
        },
      ],
    });
    state().advance();
    expect(state().stepIndex).toBe(1);
  });

  it("finishes when every step left is passed over", () => {
    const onEnd = vi.fn();
    state().startTour({
      id: "t",
      steps: [step("a"), { ...step("b"), skipIf: () => true }],
      onEnd,
    });
    state().advance();
    expect(state().tour).toBeNull();
    expect(onEnd).toHaveBeenCalledWith(true);
  });

  it("runs the step's onSkip when the user skips it, then moves on", () => {
    const onSkip = vi.fn();
    state().startTour({
      id: "t",
      steps: [{ ...step("a"), onSkip }, step("b")],
    });
    state().skipStep(0);
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(state().stepIndex).toBe(1);
    // The user saw the skipped step: Back returns to it.
    expect(state().history).toEqual([0]);
    state().skipStep(0);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("abandons a tour without an outcome", () => {
    const onEnd = vi.fn();
    state().startTour(tour(onEnd));
    state().advance();
    state().abandonTour();
    expect(state().tour).toBeNull();
    expect(state().stepIndex).toBe(0);
    expect(onEnd).not.toHaveBeenCalled();
    expect(state().progress).toEqual(EMPTY_PROGRESS);
    expect(state().tourAbandoned).toBe(true);
    expect(selectTourActive(state())).toBe(false);
  });

  it("only marks a tour abandoned when one was running", () => {
    state().abandonTour();
    expect(state().tourAbandoned).toBe(false);
  });

  it("is active from a tour's start until it ends, finished or not", () => {
    expect(selectTourActive(state())).toBe(false);
    state().startTour(tour());
    expect(selectTourActive(state())).toBe(true);
    state().endTour(false);
    expect(selectTourActive(state())).toBe(false);
    state().startTour(tour());
    state().advance();
    state().advance();
    state().advance();
    expect(selectTourActive(state())).toBe(false);
  });
});
