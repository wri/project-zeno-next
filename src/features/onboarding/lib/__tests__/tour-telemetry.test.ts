import { beforeEach, describe, expect, it } from "vitest";

import type { OnboardingTourEvent } from "@/app/lib/track-event";
import type { TourAnchorId } from "@/src/shared/lib/tour-anchors";

import { EMPTY_PROGRESS } from "../../model/onboarding-progress";
import useOnboardingStore from "../../model/onboarding-store";
import { anchorTarget, type Tour, type TourStep } from "../../model/tour";
import {
  tourTelemetryEvents,
  type TourTelemetryState,
} from "../tour-telemetry";

let actionDone = false;
const step = (
  id: string,
  extra: Partial<TourStep<unknown>> = {}
): TourStep<unknown> => ({ id, title: id, body: null, ...extra });

const TOUR: Tour<unknown> = {
  id: "first-run",
  steps: [
    step("welcome"),
    step("open-catalog", {
      target: anchorTarget("datasets-button"),
      waitFor: () => actionDone,
    }),
    step("card", { target: anchorTarget("chat-area-card"), optional: true }),
    step("map", {
      target: {
        kind: "map",
        bounds: [
          [0, 0],
          [1, 1],
        ],
      },
    }),
  ],
};

const state = (over: Partial<TourTelemetryState> = {}): TourTelemetryState => ({
  tour: TOUR,
  stepIndex: 0,
  history: [],
  lastTourCompleted: null,
  progress: EMPTY_PROGRESS,
  ...over,
});

let hidden: ReadonlySet<TourAnchorId> = new Set();
const events = (prev: TourTelemetryState, next: TourTelemetryState) =>
  tourTelemetryEvents(prev, next, {
    anchorShown: (id) => !hidden.has(id),
    msOnStep: 1200,
  });
const names = (list: OnboardingTourEvent[]) => list.map((e) => e.event);

beforeEach(() => {
  actionDone = false;
  hidden = new Set();
});

describe("tourTelemetryEvents", () => {
  it("reports a start and the first step", () => {
    expect(events(state({ tour: null }), state())).toEqual([
      {
        event: "tour_started",
        tour_id: "first-run",
        step_count: 4,
        first_visit: true,
      },
      {
        event: "tour_step_viewed",
        tour_id: "first-run",
        step_id: "welcome",
        step_number: 1,
        step_count: 4,
      },
    ]);
  });

  it("marks a replay of the tour as not a first visit", () => {
    const progress = { ...EMPTY_PROGRESS, tourOutcome: "skipped" as const };
    const [started] = events(state({ tour: null }), state({ progress }));
    expect(started).toMatchObject({ first_visit: false });
  });

  it("sends nothing when the tour and step are unchanged", () => {
    expect(events(state(), state({ progress: EMPTY_PROGRESS }))).toEqual([]);
  });

  it("reports only the next step after Next", () => {
    const list = events(state(), state({ stepIndex: 1, history: [0] }));
    expect(list).toEqual([
      expect.objectContaining({
        event: "tour_step_viewed",
        step_id: "open-catalog",
        step_number: 2,
      }),
    ]);
  });

  it("counts an action step left undone as skipped by the user", () => {
    const list = events(
      state({ stepIndex: 1, history: [0] }),
      state({ stepIndex: 2, history: [0, 1] })
    );
    expect(list[0]).toEqual({
      event: "tour_step_skipped",
      tour_id: "first-run",
      step_id: "open-catalog",
      step_number: 2,
      skipped_by: "user",
      ms_on_step: 1200,
    });
    expect(names(list)).toEqual(["tour_step_skipped", "tour_step_viewed"]);
  });

  it("does not count an action step the user did as skipped", () => {
    actionDone = true;
    const list = events(
      state({ stepIndex: 1, history: [0] }),
      state({ stepIndex: 2, history: [0, 1] })
    );
    expect(names(list)).toEqual(["tour_step_viewed"]);
  });

  it("counts a step left out of history as skipped by the tour", () => {
    const list = events(
      state({ stepIndex: 2, history: [0, 1] }),
      state({ stepIndex: 3, history: [0, 1] })
    );
    expect(list[0]).toMatchObject({
      event: "tour_step_skipped",
      step_id: "card",
      skipped_by: "tour",
    });
  });

  it("reports only the step returned to on Back", () => {
    const list = events(
      state({ stepIndex: 2, history: [0, 1] }),
      state({ stepIndex: 1, history: [0] })
    );
    expect(names(list)).toEqual(["tour_step_viewed"]);
  });

  it("reports a step left while its anchor is not on screen", () => {
    hidden = new Set(["chat-area-card"]);
    const list = events(
      state({ stepIndex: 2, history: [0, 1] }),
      state({ stepIndex: 3, history: [0, 1] })
    );
    expect(list[0]).toEqual({
      event: "tour_target_missing",
      tour_id: "first-run",
      step_id: "card",
      anchor_id: "chat-area-card",
      optional: true,
      ms_on_step: 1200,
    });
    expect(names(list)).toEqual([
      "tour_target_missing",
      "tour_step_skipped",
      "tour_step_viewed",
    ]);
  });

  it("never reports a map target as missing", () => {
    hidden = new Set(["datasets-button", "chat-area-card"]);
    const list = events(
      state({ stepIndex: 3, history: [0, 1, 2] }),
      state({ tour: null, stepIndex: 0, history: [], lastTourCompleted: true })
    );
    expect(names(list)).toEqual(["tour_ended"]);
  });

  it("reports how the tour ended and on which step", () => {
    const end = (lastTourCompleted: boolean) =>
      events(
        state({ stepIndex: 3, history: [0, 1, 2] }),
        state({ tour: null, stepIndex: 0, history: [], lastTourCompleted })
      );
    expect(end(true)).toEqual([
      {
        event: "tour_ended",
        tour_id: "first-run",
        outcome: "completed",
        step_id: "map",
        step_number: 4,
        step_count: 4,
      },
    ]);
    expect(end(false)[0]).toMatchObject({ outcome: "closed" });
  });
});

describe("tour telemetry with the onboarding store", () => {
  beforeEach(() =>
    useOnboardingStore.setState({
      tour: null,
      stepIndex: 0,
      history: [],
      progress: EMPTY_PROGRESS,
      lastTourCompleted: null,
    })
  );

  const record = () => {
    const sent: OnboardingTourEvent[] = [];
    const unsubscribe = useOnboardingStore.subscribe((next, prev) =>
      sent.push(
        ...tourTelemetryEvents(prev, next, {
          anchorShown: () => true,
          msOnStep: 0,
        })
      )
    );
    return { sent, unsubscribe };
  };

  it("sees a finished tour as completed", () => {
    const { sent, unsubscribe } = record();
    const store = useOnboardingStore.getState();
    store.startTour({ id: "t", steps: [step("a"), step("b")] });
    store.advance();
    store.advance();
    unsubscribe();
    expect(sent.at(-1)).toMatchObject({
      event: "tour_ended",
      outcome: "completed",
      step_id: "b",
    });
  });

  it("sees a closed tour as closed", () => {
    const { sent, unsubscribe } = record();
    const store = useOnboardingStore.getState();
    store.startTour({ id: "t", steps: [step("a"), step("b")] });
    store.endTour(false);
    unsubscribe();
    expect(sent.at(-1)).toMatchObject({
      event: "tour_ended",
      outcome: "closed",
      step_id: "a",
    });
  });
});
