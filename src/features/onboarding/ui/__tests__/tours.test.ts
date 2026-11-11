import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));

import { TREE_COVER_LOSS_DATASET_ID } from "@/app/constants/datasets";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import type { ChatMessage } from "@/app/types/chat";

import { EMPTY_PROGRESS } from "../../model/onboarding-progress";
import useOnboardingStore from "../../model/onboarding-store";
import {
  canSkipWhileWaiting,
  stepKind,
  type StepKind,
} from "../../model/step-policy";
import {
  GADM_BOUNDARY_LAYER,
  isDatasetOnMap,
  showDatasetOnMap,
} from "../app-actions";
import { CHECKLIST_ITEMS } from "../tours/checklist-tours";
import { createFirstRunTour } from "../tours/first-run-tour";

const state = () => useOnboardingStore.getState();
const currentStepId = () => state().tour?.steps[state().stepIndex]?.id;

/** Move on as the overlay's Next would, until `id` shows. */
function goTo(id: string) {
  for (let i = 0; i < 30 && currentStepId() !== id; i++)
    state().advance(false, state().stepIndex);
  expect(currentStepId()).toBe(id);
}

const msg = (type: ChatMessage["type"]) =>
  ({
    id: Math.random().toString(36),
    type,
    message: "",
    timestamp: new Date().toISOString(),
  }) as ChatMessage;

beforeEach(() => {
  useOnboardingStore.setState({
    tour: null,
    stepIndex: 0,
    history: [],
    draftPrompt: null,
    progress: EMPTY_PROGRESS,
    tourAbandoned: false,
  });
  useChatStore.setState({
    messages: [],
    isLoading: false,
    completedAnswers: 0,
    isGeneratingInsight: false,
  });
  useMapStore.getState().reset();
  // No map in a test: the Kenya step's fly-to has nothing to move.
  useMapStore.setState({ flyToBounds: vi.fn() });
  useSidebarStore.setState({ dataCatalogOpen: false, areasPanelOpen: false });
});

describe("first-run tour steps", () => {
  // The four kinds, step by step. Changing a step's kind changes what keeps
  // the user moving (Skip step, the wait limit), so it should be deliberate.
  const KINDS: Record<string, StepKind> = {
    welcome: "info",
    "open-catalog": "action",
    "turn-on-tcl": "action",
    "open-areas": "action",
    "show-gadm": "action",
    "pick-kenya": "action",
    "view-analysis": "action",
    insight: "answer-card",
    "ask-in-chat": "action",
    working: "app-wait",
    "area-card": "answer-card",
    "dataset-card": "answer-card",
    generating: "app-wait",
    "analysis-on-map": "info",
    "analysis-card": "answer-card",
    explanation: "app-wait",
    "answer-failed": "info",
    menu: "info",
    done: "info",
  };

  it("has the kind each step is meant to have", () => {
    const steps = createFirstRunTour().steps;
    expect(Object.fromEntries(steps.map((s) => [s.id, stepKind(s)]))).toEqual(
      KINDS
    );
  });

  it("never waits without a way forward", () => {
    for (const s of createFirstRunTour().steps) {
      const kind = stepKind(s);
      if (kind === "action") expect(canSkipWhileWaiting(s, false)).toBe(true);
      // Waits on the app offer Skip step once they have waited long enough.
      if (kind === "app-wait" || kind === "answer-card")
        expect(canSkipWhileWaiting(s, true)).toBe(true);
    }
  });
});

describe("first-run tour flow", () => {
  it("leaves the map alone until the user presses Let's go", () => {
    showDatasetOnMap(TREE_COVER_LOSS_DATASET_ID);
    state().startTour(createFirstRunTour());
    expect(currentStepId()).toBe("welcome");
    expect(isDatasetOnMap(TREE_COVER_LOSS_DATASET_ID)()).toBe(true);

    state().advance(false, 0);
    expect(currentStepId()).toBe("open-catalog");
    expect(useMapStore.getState().layers).toEqual([]);
  });

  it("does the hands-on steps for a user who skips them", () => {
    state().startTour(createFirstRunTour());
    goTo("open-catalog");
    state().skipStep(state().stepIndex);
    expect(useSidebarStore.getState().dataCatalogOpen).toBe(true);
    expect(currentStepId()).toBe("turn-on-tcl");

    state().skipStep(state().stepIndex);
    expect(isDatasetOnMap(TREE_COVER_LOSS_DATASET_ID)()).toBe(true);

    state().skipStep(state().stepIndex);
    expect(useSidebarStore.getState().areasPanelOpen).toBe(true);

    state().skipStep(state().stepIndex);
    expect(useMapStore.getState().selectAreaLayer).toBe(GADM_BOUNDARY_LAYER);
    expect(currentStepId()).toBe("pick-kenya");
  });

  it("goes from a skipped Kenya straight to the chat question", () => {
    state().startTour(createFirstRunTour());
    goTo("pick-kenya");
    // No area: nothing to analyse, so no View analysis and no chart to read.
    state().skipStep(state().stepIndex);
    expect(currentStepId()).toBe("ask-in-chat");
  });

  it("holds the hand-run chart step while the chart loads", () => {
    const insight = createFirstRunTour().steps.find((s) => s.id === "insight");
    useChatStore.setState({ isGeneratingInsight: true });
    expect(insight?.holdWhile?.()).toBe(true);
    useChatStore.setState({ isGeneratingInsight: false });
    expect(insight?.holdWhile?.()).toBe(false);
  });

  it("passes over the whole answer when the question is skipped", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    state().skipStep(state().stepIndex);
    expect(currentStepId()).toBe("menu");
  });

  it("shows the failure step, not the explanation, after a failed answer", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    // Sent, then finished with an error and no counted answer.
    useChatStore.setState({ messages: [msg("user"), msg("error")] });
    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("answer-failed");
  });

  it("walks through a good answer and passes over the failure step", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    useChatStore.setState({
      messages: [msg("user"), msg("area-card"), msg("assistant")],
      completedAnswers: 1,
    });
    state().advance(false, state().stepIndex);
    // "working" is done already, so the answer starts at its first card.
    expect(currentStepId()).toBe("area-card");
    goTo("explanation");
    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("menu");
  });
});

describe("checklist walkthroughs", () => {
  it("are passive: every step is read and moved on with Next or Done", () => {
    for (const item of CHECKLIST_ITEMS)
      for (const s of item.steps)
        expect([item.id, stepKind(s)]).toEqual([item.id, "info"]);
  });
});
