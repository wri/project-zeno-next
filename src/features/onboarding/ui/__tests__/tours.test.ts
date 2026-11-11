import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ChakraProvider,
  defaultSystem,
  type ChakraProviderProps,
} from "@chakra-ui/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));

import { TREE_COVER_LOSS_DATASET_ID } from "@/app/constants/datasets";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import useInsightStore from "@/app/store/insightStore";
import type { Layer } from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import type { ChatMessage, InsightWidget } from "@/app/types/chat";

import { EMPTY_PROGRESS } from "../../model/onboarding-progress";
import useOnboardingStore from "../../model/onboarding-store";
import {
  SHOW_RESULT_MS,
  canSkipWhileWaiting,
  stepKind,
  type StepKind,
} from "../../model/step-policy";
import { checklistEvidence, isDatasetOnMap } from "../app-actions";
import { dailyPromptsNote } from "../tour-content";
import {
  CHECKLIST_ITEMS,
  GUIDE_DONE_LABEL,
  MANUAL_TICK_LABEL,
  createChecklistTour,
} from "../tours/checklist-tours";
import {
  CHAT_DEMO_PROMPT,
  FIRST_RUN_STEP_COUNT,
  createFirstRunTour,
} from "../tours/first-run-tour";

const state = () => useOnboardingStore.getState();
const current = () => state().tour?.steps[state().stepIndex];
const currentStepId = () => current()?.id;

/** Move on as the overlay's Next would, until `id` shows. */
function goTo(id: string) {
  for (let i = 0; i < 30 && currentStepId() !== id; i++)
    state().advance(false, state().stepIndex);
  expect(currentStepId()).toBe(id);
}

/** A step body as HTML text (node has no DOM; server rendering needs none). */
const bodyText = (body: unknown) =>
  renderToStaticMarkup(
    createElement(
      ChakraProvider,
      // Children go as the third argument; the props type wants them too.
      { value: defaultSystem } as ChakraProviderProps,
      body as ReactNode
    )
  ).replace(/<[^>]+>/g, " ");

const msg = (type: ChatMessage["type"], extra: Partial<ChatMessage> = {}) =>
  ({
    id: Math.random().toString(36),
    type,
    message: "",
    timestamp: new Date().toISOString(),
    ...extra,
  }) as ChatMessage;

const chart = (over: Partial<InsightWidget> = {}): InsightWidget => ({
  id: Math.random().toString(36),
  type: "bar",
  title: "t",
  description: "",
  data: [],
  xAxis: "x",
  yAxis: "y",
  ...over,
});
const AI_CHART = chart({
  curated: false,
  generation: { codeact_parts: [{ type: "code_block", content: "" }] },
});
const CURATED_CHART = chart({ curated: true });

const KENYA: Layer = {
  id: "Kenya",
  name: "Kenya",
  type: "geojson",
  visible: true,
  featureRefs: [{ name: "Kenya", source: "gadm", srcId: "KEN" }],
};

/** The user picked Kenya in search (what the find-area step waits for). */
const pickKenya = () =>
  useMapStore.setState((s) => ({ layers: [...s.layers, KENYA] }));

/** A sent question whose answer finished, with or without a counted answer. */
function answer({
  ok,
  charts = [],
}: {
  ok: boolean;
  charts?: InsightWidget[];
}) {
  useChatStore.setState({
    messages: [msg("user"), msg(ok ? "assistant" : "error")],
    isLoading: false,
    completedAnswers: ok ? 1 : 0,
  });
  useInsightStore.setState({ insights: charts });
}

beforeEach(() => {
  useOnboardingStore.setState({
    tour: null,
    stepIndex: 0,
    history: [],
    draftPrompt: null,
    progress: EMPTY_PROGRESS,
    hydrated: true,
    tourAbandoned: false,
  });
  useChatStore.setState({
    messages: [],
    isLoading: false,
    completedAnswers: 0,
    isGeneratingInsight: false,
  });
  useInsightStore.getState().clearInsights();
  useMapStore.getState().reset();
  useSidebarStore.setState({ dataCatalogOpen: false, areasPanelOpen: false });
  useAuthStore.setState({ usedPrompts: 3, totalPrompts: 25 });
});

describe("first-run tour steps", () => {
  // The four kinds, step by step. Changing a step's kind changes what keeps
  // the user moving (Skip step, the wait limit), so it should be deliberate.
  const KINDS: Record<string, StepKind> = {
    welcome: "info",
    "open-catalog": "action",
    "turn-on-tcl": "action",
    "find-area": "action",
    "view-analysis": "action",
    insight: "app-wait",
    "ask-in-chat": "action",
    answer: "app-wait",
    "ai-chart": "info",
    done: "info",
  };

  it("has the kind each step is meant to have", () => {
    const steps = createFirstRunTour().steps;
    expect(Object.fromEntries(steps.map((s) => [s.id, stepKind(s)]))).toEqual(
      KINDS
    );
  });

  it("is as long as the welcome says", () => {
    const steps = createFirstRunTour().steps;
    expect(steps).toHaveLength(FIRST_RUN_STEP_COUNT);
    expect(steps[0].eyebrow).toContain(`${steps.length} steps`);
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

  it("names no step number in an eyebrow (the popover counts)", () => {
    for (const s of createFirstRunTour().steps)
      expect(s.eyebrow ?? "").not.toMatch(/step \d/i);
  });

  it("holds after the map changes, so the user sees the result", () => {
    const steps = createFirstRunTour().steps;
    const hold = (id: string) => steps.find((s) => s.id === id)?.advanceDelayMs;
    expect(hold("turn-on-tcl")).toBe(SHOW_RESULT_MS);
    expect(hold("find-area")).toBe(SHOW_RESULT_MS);
  });

  it("points at no chat card: the answer's cards are read in one step", () => {
    const targets = createFirstRunTour().steps.flatMap((s) =>
      s.target?.kind === "selector" ? [s.target.id] : []
    );
    expect(targets.filter((id) => id.startsWith("chat-"))).toEqual([
      "chat-input",
      "chat-panel",
    ]);
  });
});

describe("first-run tour flow", () => {
  it("leaves the map alone until the user presses Start the tour", () => {
    useMapStore.getState().addLayer({
      id: "tcl",
      name: "Tree cover loss",
      type: "raster",
      visible: true,
      datasetId: TREE_COVER_LOSS_DATASET_ID,
    });
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
    expect(currentStepId()).toBe("find-area");
    // The tour opens the Areas panel itself; the search is the user's.
    expect(useSidebarStore.getState().areasPanelOpen).toBe(true);
  });

  it("goes from a skipped area straight to the chat question", () => {
    state().startTour(createFirstRunTour());
    goTo("find-area");
    // No area: nothing to analyse, so no View analysis and no chart to read.
    state().skipStep(state().stepIndex);
    expect(currentStepId()).toBe("ask-in-chat");
  });

  it("shows the hand-run chart step until the chart is in, then Next", () => {
    state().startTour(createFirstRunTour());
    goTo("find-area");
    pickKenya();
    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("view-analysis");
    useChatStore.setState({
      messages: [
        msg("view-analysis-nudge", {
          viewAnalysisSuggestion: {
            area: { name: "Kenya", source: "gadm", srcId: "KEN" },
            datasetId: TREE_COVER_LOSS_DATASET_ID,
            datasetName: "Tree cover loss",
            startDate: "2001-01-01",
            endDate: "2025-12-31",
            accepted: true,
          },
        }),
      ],
      isGeneratingInsight: true,
    });
    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("insight");
    const insight = current()!;
    expect(insight.waitFor?.()).toBe(false);
    expect(insight.skipIf?.()).toBe(false);

    useChatStore.setState({ isGeneratingInsight: false });
    useInsightStore.setState({ insights: [CURATED_CHART] });
    expect(insight.waitFor?.()).toBe(true);
    expect(insight.skipIf?.()).toBe(false);
  });

  it("passes over the hand-run chart step when the chart failed", () => {
    const insight = createFirstRunTour().steps.find((s) => s.id === "insight")!;
    useChatStore.setState({
      messages: [
        msg("view-analysis-nudge", {
          viewAnalysisSuggestion: {
            area: { name: "Kenya", source: "gadm" },
            datasetId: TREE_COVER_LOSS_DATASET_ID,
            datasetName: "Tree cover loss",
            startDate: "2001-01-01",
            endDate: "2025-12-31",
            accepted: true,
          },
        }),
      ],
      isGeneratingInsight: false,
    });
    expect(insight.skipIf?.()).toBe(true);
  });

  it("sets up the chat question: dataset kept, area and charts gone, question written", () => {
    state().startTour(createFirstRunTour());
    goTo("find-area");
    useMapStore.getState().addLayer({
      id: "tcl",
      name: "Tree cover loss",
      type: "raster",
      visible: true,
      datasetId: TREE_COVER_LOSS_DATASET_ID,
    });
    pickKenya();
    useInsightStore.setState({ insights: [CURATED_CHART] });
    goTo("ask-in-chat");

    expect(useMapStore.getState().layers.map((l) => l.id)).toEqual(["tcl"]);
    expect(useInsightStore.getState().insights).toEqual([]);
    expect(state().draftPrompt).toBe(CHAT_DEMO_PROMPT);
  });

  it("offers Skip step on the question when no prompts are left, and says so", () => {
    useAuthStore.setState({ usedPrompts: 25, totalPrompts: 25 });
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    const ask = current()!;
    // An action step: Skip step shows from the start, quota or not.
    expect(stepKind(ask)).toBe("action");
    expect(canSkipWhileWaiting(ask, false)).toBe(true);
    expect(bodyText(ask.body)).toContain("Press Skip step");

    state().skipStep(state().stepIndex);
    // Nothing sent: the answer steps have nothing to show.
    expect(currentStepId()).toBe("done");
  });

  it("states the allowance the server reported, never a fixed number", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    expect(bodyText(current()!.body)).toContain(
      "uses 1 of your 25 daily prompts"
    );
    useAuthStore.setState({ usedPrompts: 0, totalPrompts: 50 });
    expect(bodyText(current()!.body)).toContain("1 of your 50 daily prompts");
  });

  it("explains a failed answer in the answer step, then skips the chart step", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    answer({ ok: false });
    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("answer");
    const step = current()!;
    expect(step.waitFor?.()).toBe(true);
    expect(bodyText(step.body)).toContain("could not finish this answer");

    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("done");
  });

  it("walks a good answer with an AI-assisted chart through Show working", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    answer({ ok: true, charts: [AI_CHART] });
    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("answer");
    expect(bodyText(current()!.body)).toContain("check it");

    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("ai-chart");
    expect(bodyText(current()!.body)).toContain("Show working");
  });

  it("never tells the user to click Show working on a curated answer chart", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    answer({ ok: true, charts: [CURATED_CHART] });
    goTo("ai-chart");
    const text = bodyText(current()!.body);
    expect(text).not.toContain("Show working");
    expect(text).toContain("chart is");
  });

  it("passes over the chart step for an answer without a chart", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    answer({ ok: true });
    state().advance(false, state().stepIndex);
    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("done");
  });

  it("ticks nothing when it ends, however it ends", () => {
    // Ending puts the default dataset back, which reads the URL's flags.
    vi.stubGlobal("window", { location: { search: "" } });
    const run = (finishOn: () => void) => {
      useOnboardingStore.setState({ progress: EMPTY_PROGRESS });
      state().startTour(createFirstRunTour());
      finishOn();
      expect(state().tour).toBeNull();
      expect(state().progress.checklistDone).toEqual([]);
    };
    // Completed after a failed answer.
    run(() => {
      goTo("ask-in-chat");
      answer({ ok: false });
      goTo("done");
      state().advance(false, state().stepIndex);
    });
    // Completed after a good one.
    run(() => {
      goTo("ask-in-chat");
      answer({ ok: true, charts: [AI_CHART] });
      goTo("done");
      state().advance(false, state().stepIndex);
    });
    // Skipped at the welcome.
    run(() => state().endTour(false));
    vi.unstubAllGlobals();
  });

  it("brings back a hidden checklist, even when skipped at the welcome", () => {
    useOnboardingStore.setState({
      progress: { ...EMPTY_PROGRESS, checklistDismissed: true },
    });
    state().startTour(createFirstRunTour());
    current()!.secondary!.onClick(state().endTour);
    expect(state().progress).toMatchObject({
      tourOutcome: "skipped",
      checklistDismissed: false,
    });
  });
});

describe("dailyPromptsNote", () => {
  const NONE = "none left";
  it("counts the prompt a question uses", () => {
    expect(dailyPromptsNote(3, 25, NONE)).toBe(
      "Sending this question uses 1 of your 25 daily prompts."
    );
  });
  it("says what to do when none are left", () => {
    expect(dailyPromptsNote(25, 25, NONE)).toBe(NONE);
  });
  it("says nothing for an unlimited allowance", () => {
    expect(dailyPromptsNote(3, 99_999, NONE)).toBeNull();
  });
});

describe("checklist tasks", () => {
  it("are guides: info steps that end with Got it", () => {
    for (const item of CHECKLIST_ITEMS) {
      const steps = createChecklistTour(item).steps;
      for (const s of steps)
        expect([item.id, stepKind(s)]).toEqual([item.id, "info"]);
      expect(steps.at(-1)?.ctaLabel).toBe(GUIDE_DONE_LABEL);
    }
  });

  it("are ticked from evidence, except the one the app can't see", () => {
    const detected = CHECKLIST_ITEMS.filter((i) => i.completion === "detected");
    expect(detected.map((i) => i.id).sort()).toEqual(
      Object.keys(checklistEvidence()).sort()
    );
    expect(
      CHECKLIST_ITEMS.filter((i) => i.completion === "manual").map((i) => i.id)
    ).toEqual(["dashboard-pdf"]);
  });

  it("never tick on finishing a guide", () => {
    for (const item of CHECKLIST_ITEMS) {
      state().startTour(createChecklistTour(item));
      for (let i = 0; i < 5 && state().tour; i++)
        state().advance(false, state().stepIndex);
      expect(state().tour).toBeNull();
    }
    expect(state().progress.checklistDone).toEqual([]);
  });

  it("let the user tick the PDF task, as theirs", () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === "dashboard-pdf")!;
    state().startTour(createChecklistTour(item));
    goTo("dashboard-pdf");
    const last = current()!;
    expect(last.secondary?.label).toBe(MANUAL_TICK_LABEL);
    last.secondary!.onClick(state().endTour);
    expect(state().progress.checklistDone).toEqual(["dashboard-pdf"]);
    expect(state().lastTickedBy).toBe("manual");
    expect(state().tour).toBeNull();
  });

  it("clear the other datasets first, so View analysis offers the alerts", () => {
    useMapStore.getState().addLayer({
      id: "tcl",
      name: "Tree cover loss",
      type: "raster",
      visible: true,
      datasetId: TREE_COVER_LOSS_DATASET_ID,
    });
    const item = CHECKLIST_ITEMS.find((i) => i.id === "alerts")!;
    state().startTour(createChecklistTour(item));
    expect(useMapStore.getState().layers).toEqual([]);
    expect(useSidebarStore.getState().dataCatalogOpen).toBe(true);
  });

  it("clear the datasets off the map before asking for imagery", () => {
    useMapStore.getState().addLayer({
      id: "tcl",
      name: "Tree cover loss",
      type: "raster",
      visible: true,
      datasetId: TREE_COVER_LOSS_DATASET_ID,
    });
    pickKenya();
    const item = CHECKLIST_ITEMS.find((i) => i.id === "satellite-imagery")!;
    state().startTour(createChecklistTour(item));
    expect(useMapStore.getState().layers.map((l) => l.id)).toEqual(["Kenya"]);
    expect(state().draftPrompt).toContain("satellite imagery");
  });
});
