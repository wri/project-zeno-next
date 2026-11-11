import { beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_PROGRESS } from "../onboarding-progress";
import useOnboardingStore from "../onboarding-store";
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
    state().markChecklistDone(["ask", "data"]);
    state().markChecklistDone(["data", "imagery"]);
    expect(state().progress.checklistDone).toEqual(["ask", "data", "imagery"]);
  });

  it("leaves progress untouched when nothing new is done", () => {
    state().markChecklistDone(["ask"]);
    const before = state().progress;
    state().markChecklistDone(["ask"]);
    expect(state().progress).toBe(before);
  });

  it("records the outcome and covered items in one update", () => {
    const listener = vi.fn();
    const unsubscribe = useOnboardingStore.subscribe(listener);
    state().recordTourOutcome("completed", ["ask", "data"]);
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(state().progress).toEqual({
      tourOutcome: "completed",
      checklistDone: ["ask", "data"],
      checklistDismissed: false,
    });
  });

  it("dismisses the checklist", () => {
    state().dismissChecklist();
    expect(state().progress.checklistDismissed).toBe(true);
  });
});
