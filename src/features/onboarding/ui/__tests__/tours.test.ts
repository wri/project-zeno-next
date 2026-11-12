import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ChakraProvider,
  defaultSystem,
  type ChakraProviderProps,
} from "@chakra-ui/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));

import { TREE_COVER_LOSS_DATASET_ID } from "@/app/constants/datasets";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import useInsightStore from "@/app/store/insightStore";
import type { Layer } from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import type { ChatMessage, InsightWidget } from "@/app/types/chat";
import { LGMS_NET_FLUX_DATASET_ID } from "@/app/utils/defaultMapLayers";

import { EMPTY_PROGRESS } from "../../model/onboarding-progress";
import useOnboardingStore from "../../model/onboarding-store";
import {
  SHOW_RESULT_MS,
  canSkipWhileWaiting,
  docksOnTargetClick,
  stepKind,
  waitStartedAgain,
  type StepKind,
  type StepStatusFacts,
} from "../../model/step-policy";
import type { TourStep } from "../../model/tour";
import { checklistEvidence, isDatasetOnMap } from "../app-actions";
import { skippedNotice, stepStatus } from "../status-copy";
import { NO_PROMPTS_TODAY, dailyPromptsNote } from "../tour-content";
import { CHECKLIST_NAME } from "../tour-entry";
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
/** The footer hint as the overlay shows it (a hint may be a function). */
const hintOf = (step: { hint?: string | (() => string) }) =>
  typeof step.hint === "function" ? step.hint() : step.hint;

/**
 * The status bar as the overlay shows it: the step's own predicates read
 * now, waiting unless `over` says otherwise.
 */
const statusOf = (
  step: TourStep<unknown>,
  over: Partial<Omit<StepStatusFacts, "kind">> = {}
) =>
  stepStatus(step, {
    awaitingAction: !!step.waitFor,
    waitedLong: false,
    completing: false,
    failed: !!step.failedIf?.(),
    asked: !!step.askedIf?.(),
    blocked: !!step.blockedIf?.(),
    ...over,
  });
/** The settled answer step: Next shows. */
const SETTLED = { awaitingAction: false, completing: true } as const;
/**
 * A step whose first wait is over (Next shows), as the overlay works out its
 * status: waiting again if the app is working again.
 */
const statusOnceOver = (step: TourStep<unknown>) => {
  const again = waitStartedAgain(step, {
    waitOver: true,
    waitDoneNow: !!step.waitFor?.(),
  });
  return statusOf(step, { awaitingAction: again, completing: !again });
};
/** What the step now open says about the steps passed over to reach it. */
const noticeNow = () => skippedNotice(state().passedOver);

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

/**
 * A sent question whose answer finished, with or without a counted answer.
 * `askedBack`: the turn ended by asking the user to choose (a nudge), which
 * the chat store doesn't count as an answer.
 */
function answer({
  ok,
  charts = [],
  askedBack = false,
}: {
  ok: boolean;
  charts?: InsightWidget[];
  askedBack?: boolean;
}) {
  useChatStore.setState({
    messages: askedBack
      ? [msg("user"), msg("assistant"), msg("nudge")]
      : [msg("user"), msg(ok ? "assistant" : "error")],
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
    progress: EMPTY_PROGRESS,
    hydrated: true,
    tourAbandoned: false,
  });
  useChatStore.setState({
    messages: [],
    isLoading: false,
    completedAnswers: 0,
    isGeneratingInsight: false,
    draftPrompt: null,
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
      if (kind === "app-wait") expect(canSkipWhileWaiting(s, true)).toBe(true);
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

  it("lights only the nudge on the View analysis step, not the chat input", () => {
    // A question typed in a lit chat would use one of the daily prompts.
    const step = createFirstRunTour().steps.find(
      (s) => s.id === "view-analysis"
    )!;
    expect(step.target?.id).toBe("view-analysis-nudge");
    expect(step.focus).toBeUndefined();
  });

  it("rings the control the copy names inside a large target", () => {
    const focus = Object.fromEntries(
      createFirstRunTour().steps.flatMap((s) =>
        s.focus ? [[s.id, [s.target?.id, s.focus.id]]] : []
      )
    );
    expect(focus).toEqual({
      "find-area": ["areas-panel", "areas-search"],
    });
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

  it("does the View analysis step only on its nudge, even if a question is sent there", () => {
    const nudge = (accepted: boolean) =>
      msg("view-analysis-nudge", {
        viewAnalysisSuggestion: {
          area: { name: "Kenya", source: "gadm", srcId: "KEN" },
          datasetId: TREE_COVER_LOSS_DATASET_ID,
          datasetName: "Tree cover loss",
          startDate: "2001-01-01",
          endDate: "2025-12-31",
          accepted,
        },
      });
    state().startTour(createFirstRunTour());
    goTo("find-area");
    pickKenya();
    useChatStore.setState({ messages: [nudge(false)] });
    state().advance(false, state().stepIndex);
    const step = current()!;
    expect(step.id).toBe("view-analysis");

    // The chat input is dimmed, and out of keyboard reach too. A question
    // that comes all the same is answered as usual.
    useChatStore.setState({
      messages: [nudge(false), msg("user"), msg("assistant")],
      completedAnswers: 1,
    });
    // Not done, still the user's turn, with Skip step there as always.
    expect(step.waitFor?.()).toBe(false);
    expect(step.skipIf?.()).toBe(false);
    expect(statusOf(step)?.tone).toBe("turn");
    expect(canSkipWhileWaiting(step, false)).toBe(true);

    // Clicking the nudge (still in the chat) does the step.
    useChatStore.setState({
      messages: [nudge(true), msg("user"), msg("assistant")],
      isGeneratingInsight: true,
    });
    expect(step.waitFor?.()).toBe(true);
    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("insight");

    // The chat half counts from its own start: that question is not its.
    useChatStore.setState({ isGeneratingInsight: false });
    useInsightStore.setState({ insights: [CURATED_CHART] });
    goTo("ask-in-chat");
    const ask = current()!;
    expect(ask.waitFor?.()).toBe(false);
    state().skipStep(state().stepIndex);
    expect(currentStepId()).toBe("done");
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
    expect(useChatStore.getState().draftPrompt).toBe(CHAT_DEMO_PROMPT);
    // It says what it took off, and only that.
    expect(bodyText(current()!.body)).toContain(
      "We removed the area and the chart from the map."
    );
  });

  it("claims to remove nothing when there was nothing on the map", () => {
    state().startTour(createFirstRunTour());
    goTo("find-area");
    state().skipStep(state().stepIndex);
    expect(currentStepId()).toBe("ask-in-chat");
    const text = bodyText(current()!.body);
    expect(text).not.toContain("We removed");
    expect(text).toContain("Now ask in the chat.");
  });

  it("offers Skip step on the question, quota or not", () => {
    useAuthStore.setState({ usedPrompts: 25, totalPrompts: 25 });
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    const ask = current()!;
    // An action step: Skip step shows from the start, quota or not.
    expect(stepKind(ask)).toBe("action");
    expect(canSkipWhileWaiting(ask, false)).toBe(true);

    state().skipStep(state().stepIndex);
    // Nothing sent: the answer steps have nothing to show.
    expect(currentStepId()).toBe("done");
  });

  it("asks for the question to be sent while prompts are left", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    const ask = current()!;
    expect(bodyText(ask.body)).toContain("to send the question");
    expect(hintOf(ask)).toBe("Send the question");
    expect(statusOf(ask)).toEqual({
      tone: "turn",
      text: "Your turn. Send the question.",
    });
  });

  it("never asks for a send with no prompts left: it points at Skip step", () => {
    useAuthStore.setState({ usedPrompts: 25, totalPrompts: 25 });
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    const ask = current()!;
    const text = bodyText(ask.body);
    expect(text).toContain(NO_PROMPTS_TODAY);
    expect(text).not.toMatch(/send/i);
    // Blocked, not "Your turn": the ring does not pulse on a disabled input.
    expect(statusOf(ask)).toEqual({
      tone: "blocked",
      text: "No daily prompts left. Click Skip step.",
    });
  });

  it("says how long the answer can take while it waits", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    useChatStore.setState({ messages: [msg("user")], isLoading: true });
    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("answer");
    const step = current()!;
    expect(statusOf(step)?.text).toBe(
      "Waiting for the AI Assistant. This can take about 1 minute."
    );
    // Said once: in the status, not in the body too.
    expect(bodyText(step.body)).not.toContain("about 1 minute");
  });

  it("names no allowance: the store's count is a default until /auth/me answers", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    const text = bodyText(current()!.body);
    expect(text).toContain("uses 1 of your daily prompts");
    expect(text).not.toMatch(/\d+ daily prompts/);
  });

  it("explains a failed answer in the answer step, then skips the chart step", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    answer({ ok: false });
    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("answer");
    const step = current()!;
    expect(step.waitFor?.()).toBe(true);
    expect(statusOf(step, SETTLED)).toEqual({
      tone: "failed",
      text: "The AI Assistant could not finish this answer. The chat shows what went wrong.",
    });
    expect(bodyText(step.body)).toContain("Try the question again");

    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("done");
    expect(noticeNow()).toBe("We skipped a step. There is no chart to check.");
  });

  it("tells the user the assistant asked a question back, not that it failed", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    answer({ ok: false, askedBack: true });
    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("answer");
    const step = current()!;
    expect(statusOf(step, SETTLED)).toEqual({
      tone: "asked",
      text: "The AI Assistant has a question for you.",
    });
    const text = bodyText(step.body);
    expect(text).toContain("You can answer the question in the chat now.");
    expect(text).not.toContain("could not finish");

    // No answer yet, so no chart to check.
    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("done");
  });

  it("waits again when the user answers the question asked back, then says what came", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    answer({ ok: false, askedBack: true });
    state().advance(false, state().stepIndex);
    const step = current()!;
    expect(statusOnceOver(step)?.tone).toBe("asked");

    // The user replies in the chat (the step is docked): a new turn starts.
    const asked = useChatStore.getState().messages;
    useChatStore.setState({
      messages: [...asked, msg("user")],
      isLoading: true,
    });
    expect(statusOnceOver(step)).toEqual({
      tone: "wait",
      text: "Waiting for the AI Assistant. This can take about 1 minute.",
    });
    // The body is the plain one again, not "a question for you".
    expect(bodyText(step.body)).toContain("check it");

    // The new turn answers: ready, and the chart step follows.
    useChatStore.setState({
      messages: [...asked, msg("user"), msg("assistant")],
      isLoading: false,
      completedAnswers: 1,
    });
    useInsightStore.setState({ insights: [AI_CHART] });
    expect(statusOnceOver(step)).toEqual({
      tone: "done",
      text: "The answer is ready. Click Next.",
    });
    state().advance(false, state().stepIndex);
    expect(currentStepId()).toBe("ai-chart");
  });

  it("asks again, or fails, when the new turn does", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    answer({ ok: false, askedBack: true });
    state().advance(false, state().stepIndex);
    const step = current()!;
    const asked = useChatStore.getState().messages;

    useChatStore.setState({
      messages: [...asked, msg("user"), msg("assistant"), msg("nudge")],
    });
    expect(statusOnceOver(step)?.tone).toBe("asked");

    useChatStore.setState({ messages: [...asked, msg("user"), msg("error")] });
    expect(statusOnceOver(step)?.tone).toBe("failed");
  });

  it("docks a step on a press in its target only once nothing waits on the user", () => {
    for (const s of createFirstRunTour().steps) {
      if (!s.target) continue;
      // Waiting for the user's action: the press is the action, no dock.
      if (stepKind(s) === "action")
        expect([s.id, docksOnTargetClick(s, true)]).toEqual([s.id, false]);
      // Done, or nothing to wait for (an answer that is in, a chart).
      expect([s.id, docksOnTargetClick(s, false)]).toEqual([s.id, true]);
    }
  });

  it("says the answer is ready once it is in", () => {
    state().startTour(createFirstRunTour());
    goTo("ask-in-chat");
    answer({ ok: true, charts: [AI_CHART] });
    state().advance(false, state().stepIndex);
    expect(statusOf(current()!, SETTLED)).toEqual({
      tone: "done",
      text: "The answer is ready. Click Next.",
    });
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
    expect(noticeNow()).toBe("We skipped a step. The answer has no chart.");
  });

  describe("says why it skipped steps", () => {
    it("after the area search was skipped", () => {
      state().startTour(createFirstRunTour());
      goTo("find-area");
      state().skipStep(state().stepIndex);
      expect(currentStepId()).toBe("ask-in-chat");
      expect(noticeNow()).toBe(
        "We skipped 2 steps. There is no area on the map."
      );
    });

    it("after the question was skipped", () => {
      state().startTour(createFirstRunTour());
      goTo("ask-in-chat");
      state().skipStep(state().stepIndex);
      expect(currentStepId()).toBe("done");
      expect(noticeNow()).toBe(
        "We skipped 2 steps. There is no question to answer."
      );
    });

    it("when the hand-run chart fails while the step waits", () => {
      state().startTour(createFirstRunTour());
      goTo("find-area");
      pickKenya();
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
      goTo("insight");
      // The load ends with no chart; the overlay's poll passes the step over.
      useChatStore.setState({ isGeneratingInsight: false });
      state().advance(true, state().stepIndex);
      expect(currentStepId()).toBe("ask-in-chat");
      expect(noticeNow()).toBe("We skipped a step. The chart did not load.");
    });

    it("when the answer's chart card never shows (the hidden-popover gap)", () => {
      state().startTour(createFirstRunTour());
      goTo("ask-in-chat");
      answer({ ok: true, charts: [AI_CHART] });
      goTo("ai-chart");
      // The overlay gives up on the missing card after the grace period.
      state().advance(true, state().stepIndex);
      expect(currentStepId()).toBe("done");
      expect(noticeNow()).toBe(
        "We skipped a step. The chart did not show on the map."
      );
    });
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

  it("says on its last step where Get started is", () => {
    const done = createFirstRunTour().steps.find((s) => s.id === "done")!;
    expect(bodyText(done.body)).toMatch(
      new RegExp(
        `${CHECKLIST_NAME}\\s*\\. It is at the top right of the page\\.`
      )
    );
  });

  it("opens Get started from its last step, and only from its button", () => {
    // Ending puts the default dataset back, which reads the URL's flags.
    vi.stubGlobal("window", { location: { search: "" } });
    useOnboardingStore.setState({ checklistOpenedFrom: null });
    const end = (how: () => void) => {
      state().startTour(createFirstRunTour());
      how();
      return {
        open: state().checklistExpanded,
        from: state().checklistOpenedFrom,
      };
    };
    // Close on the last step, and Skip the tour at the welcome.
    expect(
      end(() => {
        goTo("done");
        current()!.secondary!.onClick(state().endTour);
      })
    ).toEqual({ open: false, from: null });
    expect(end(() => current()!.secondary!.onClick(state().endTour))).toEqual({
      open: false,
      from: null,
    });
    // Its main button.
    expect(
      end(() => {
        goTo("done");
        expect(current()!.ctaLabel).toBe(`Open ${CHECKLIST_NAME}`);
        state().advance(false, state().stepIndex);
      })
    ).toEqual({ open: true, from: "tour_end" });
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

  describe("map defaults at the end", () => {
    const TCL: Layer = {
      id: "tcl",
      name: "Tree cover loss",
      type: "raster",
      visible: true,
      datasetId: TREE_COVER_LOSS_DATASET_ID,
    };
    const datasetIds = () =>
      useMapStore
        .getState()
        .layers.filter((l) => !l.parentLayerId)
        .map((l) => l.datasetId);
    const stubSearch = (search: string) =>
      vi.stubGlobal("window", { location: { search } });
    afterEach(() => vi.unstubAllGlobals());

    it.each([
      ["skipped", () => state().endTour(false)],
      ["closed on the last step", () => state().endTour(true)],
    ])("puts the default area layer and dataset back when %s", (_, end) => {
      stubSearch("");
      useMapStore.setState({ layers: [TCL, KENYA] });
      state().startTour(createFirstRunTour());
      goTo("open-catalog");
      // The tour emptied the map and the boundary layer.
      expect(useMapStore.getState().layers).toEqual([]);
      expect(useMapStore.getState().selectAreaLayer).toBeNull();

      end();

      expect(useMapStore.getState().selectAreaLayer).toBe(
        useMapStore.getInitialState().selectAreaLayer
      );
      expect(datasetIds()).toEqual([TREE_COVER_LOSS_DATASET_ID]);
    });

    it("leaves the map alone when skipped at the welcome", () => {
      stubSearch("");
      useMapStore.setState({ layers: [KENYA], selectAreaLayer: "WDPA" });
      state().startTour(createFirstRunTour());

      state().endTour(false);

      expect(useMapStore.getState().layers).toEqual([KENYA]);
      expect(useMapStore.getState().selectAreaLayer).toBe("WDPA");
    });

    it("puts the LGMS dataset back under ?ff=net-flux", () => {
      stubSearch("?ff=net-flux");
      state().startTour(createFirstRunTour());
      goTo("open-catalog");

      state().endTour(false);

      expect(datasetIds()).toEqual([LGMS_NET_FLUX_DATASET_ID]);
    });
  });
});

describe("dailyPromptsNote", () => {
  const NONE = "none left";
  it("counts the prompt a question uses, naming no allowance", () => {
    expect(dailyPromptsNote(25, false, NONE)).toBe(
      "Sending this question uses 1 of your daily prompts."
    );
  });
  it("says what to do when none are left, also when used is above total", () => {
    expect(dailyPromptsNote(25, true, NONE)).toBe(NONE);
  });
  it("says nothing for an unlimited allowance", () => {
    expect(dailyPromptsNote(99_999, false, NONE)).toBeNull();
    expect(dailyPromptsNote(5_000, false, NONE)).not.toBeNull();
  });
  it("says nothing when no allowance is set", () => {
    expect(dailyPromptsNote(0, true, NONE)).toBeNull();
  });
});

describe("checklist tasks", () => {
  it("point at a target the user can press, which moves the guide aside", () => {
    for (const item of CHECKLIST_ITEMS)
      for (const s of createChecklistTour(item).steps)
        expect([s.id, !!s.target, docksOnTargetClick(s, false)]).toEqual([
          s.id,
          true,
          true,
        ]);
  });

  it("are guides: info steps that end with OK", () => {
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

  it("leave the PDF task's tick to its row, and say where it is", () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === "dashboard-pdf")!;
    const steps = createChecklistTour(item).steps;
    expect(steps.map((s) => s.secondary)).toEqual([undefined, undefined]);
    const last = bodyText(steps.at(-1)!.body);
    expect(last).toContain(MANUAL_TICK_LABEL);
    expect(last).toContain(CHECKLIST_NAME);
    // Nothing sends the user back into the guide.
    expect(last).not.toMatch(/again|this step/i);
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

  it("that need a prompt say when none are left, and when to try again", () => {
    useAuthStore.setState({ usedPrompts: 25, totalPrompts: 25 });
    for (const id of ["compare", "satellite-imagery"] as const) {
      const item = CHECKLIST_ITEMS.find((i) => i.id === id)!;
      const [ask] = createChecklistTour(item).steps;
      expect([id, statusOf(ask)]).toEqual([
        id,
        {
          tone: "blocked",
          text: "No daily prompts left. You can do this task tomorrow.",
        },
      ]);
    }
    useAuthStore.setState({ usedPrompts: 3, totalPrompts: 25 });
    const compare = CHECKLIST_ITEMS.find((i) => i.id === "compare")!;
    expect(statusOf(createChecklistTour(compare).steps[0])).toBeNull();
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
    expect(useChatStore.getState().draftPrompt).toContain("satellite imagery");
  });
});
