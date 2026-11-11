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

const step = (
  id: string,
  extra: Partial<TourStep<unknown>> = {}
): TourStep<unknown> => ({ id, title: id, body: null, ...extra });

const TOUR: Tour<unknown> = {
  id: "first-run",
  version: 3,
  steps: [
    step("welcome"),
    step("open-catalog", { target: anchorTarget("datasets-button") }),
    step("card", { target: anchorTarget("insight-workspace"), optional: true }),
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
  lastTourEnd: null,
  userSkips: 0,
  progress: EMPTY_PROGRESS,
  hydrated: true,
  lastTickedBy: null,
  ...over,
});

let hidden: ReadonlySet<TourAnchorId> = new Set();
const events = (prev: TourTelemetryState, next: TourTelemetryState) =>
  tourTelemetryEvents(prev, next, {
    anchorShown: (id) => !hidden.has(id),
    msOnStep: 1200,
  });
const names = (list: OnboardingTourEvent[]) => list.map((e) => e.event);
const skips = (list: OnboardingTourEvent[]) =>
  list.flatMap((e) =>
    e.event === "tour_step_skipped" ? [`${e.step_id}:${e.skipped_by}`] : []
  );

beforeEach(() => {
  hidden = new Set();
});

describe("tourTelemetryEvents", () => {
  it("reports a start and the first step", () => {
    expect(events(state({ tour: null }), state())).toEqual([
      {
        event: "tour_started",
        tour_id: "first-run",
        tour_version: 3,
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

  it("reports version 0 for a tour that declares none", () => {
    const tour = { ...TOUR, version: undefined };
    const [started] = events(state({ tour: null }), state({ tour }));
    expect(started).toMatchObject({ tour_version: 0 });
  });

  it("sends nothing when the tour, step and skips are unchanged", () => {
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

  it("reports Skip step on the step the user skipped, before the move", () => {
    const current = state({ stepIndex: 1, history: [0] });
    const counted = state({ stepIndex: 1, history: [0], userSkips: 1 });
    expect(events(current, counted)).toEqual([
      {
        event: "tour_step_skipped",
        tour_id: "first-run",
        step_id: "open-catalog",
        step_number: 2,
        skipped_by: "user",
        ms_on_step: 1200,
      },
    ]);
    // The move that follows lands the step in history: no second skip.
    const moved = state({ stepIndex: 2, history: [0, 1], userSkips: 1 });
    expect(names(events(counted, moved))).toEqual(["tour_step_viewed"]);
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
      ms_on_step: 1200,
    });
  });

  it("reports each step a move passes over, never shown", () => {
    const list = events(state(), state({ stepIndex: 3, history: [0] }));
    expect(skips(list)).toEqual(["open-catalog:tour", "card:tour"]);
    expect(list[1]).toMatchObject({ step_number: 3, ms_on_step: 0 });
    expect(list.at(-1)).toMatchObject({
      event: "tour_step_viewed",
      step_id: "map",
    });
  });

  it("reports the first steps a start passes over", () => {
    const list = events(state({ tour: null }), state({ stepIndex: 2 }));
    expect(names(list)).toEqual([
      "tour_started",
      "tour_step_skipped",
      "tour_step_skipped",
      "tour_step_viewed",
    ]);
    expect(skips(list)).toEqual(["welcome:tour", "open-catalog:tour"]);
  });

  it("reports only the step returned to on Back", () => {
    const list = events(
      state({ stepIndex: 2, history: [0, 1] }),
      state({ stepIndex: 1, history: [0] })
    );
    expect(names(list)).toEqual(["tour_step_viewed"]);
  });

  it("reports a step left while its anchor is not on screen", () => {
    hidden = new Set(["insight-workspace"]);
    const list = events(
      state({ stepIndex: 2, history: [0, 1] }),
      state({ stepIndex: 3, history: [0, 1] })
    );
    expect(list[0]).toEqual({
      event: "tour_target_missing",
      tour_id: "first-run",
      step_id: "card",
      anchor_id: "insight-workspace",
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
    hidden = new Set(["datasets-button", "insight-workspace"]);
    const list = events(
      state({ stepIndex: 3, history: [0, 1, 2] }),
      state({ tour: null, stepIndex: 0, history: [], lastTourEnd: "closed" })
    );
    expect(names(list)).toEqual(["tour_ended"]);
  });

  it("reports how the tour ended, on which step and in which version", () => {
    const end = (lastTourEnd: TourTelemetryState["lastTourEnd"]) =>
      events(
        state({ stepIndex: 1, history: [0] }),
        state({ tour: null, stepIndex: 0, history: [], lastTourEnd })
      );
    expect(end("closed")).toEqual([
      {
        event: "tour_ended",
        tour_id: "first-run",
        tour_version: 3,
        outcome: "closed",
        step_id: "open-catalog",
        step_number: 2,
        step_count: 4,
      },
    ]);
    expect(end("completed")[0]).toMatchObject({ outcome: "completed" });
    expect(end("abandoned")[0]).toMatchObject({ outcome: "abandoned" });
  });

  it("reports the last step for a tour run past its end", () => {
    const list = events(
      state({ stepIndex: 4, history: [0, 1, 2, 3] }),
      state({ tour: null, stepIndex: 0, lastTourEnd: "completed" })
    );
    expect(list).toEqual([
      expect.objectContaining({
        event: "tour_ended",
        step_id: "map",
        step_number: 4,
      }),
    ]);
  });

  it("ends a tour another one replaces with no outcome", () => {
    const other: Tour<unknown> = { id: "checklist-ask", steps: [step("a")] };
    const list = events(state(), state({ tour: other }));
    expect(list[0]).toMatchObject({
      event: "tour_ended",
      tour_id: "first-run",
      outcome: "abandoned",
    });
    expect(names(list)).toEqual([
      "tour_ended",
      "tour_started",
      "tour_step_viewed",
    ]);
  });
});

describe("checklist ticks", () => {
  const withDone = (
    checklistDone: TourTelemetryState["progress"]["checklistDone"],
    over: Partial<TourTelemetryState> = {}
  ) =>
    state({
      tour: null,
      progress: { ...EMPTY_PROGRESS, checklistDone },
      ...over,
    });

  it("reports each newly ticked item, with how it was ticked", () => {
    expect(
      events(
        withDone(["alerts"]),
        withDone(["alerts", "compare", "own-area"], {
          lastTickedBy: "detected",
        })
      )
    ).toEqual([
      {
        event: "checklist_item_done",
        item_id: "compare",
        ticked_by: "detected",
      },
      {
        event: "checklist_item_done",
        item_id: "own-area",
        ticked_by: "detected",
      },
    ]);
    expect(
      events(
        withDone([]),
        withDone(["dashboard-pdf"], { lastTickedBy: "manual" })
      )
    ).toEqual([
      {
        event: "checklist_item_done",
        item_id: "dashboard-pdf",
        ticked_by: "manual",
      },
    ]);
  });

  it("doesn't report ticks loaded from storage", () => {
    expect(
      events(withDone([], { hydrated: false }), withDone(["alerts"]))
    ).toEqual([]);
  });
});

describe("tour telemetry with the onboarding store", () => {
  beforeEach(() =>
    useOnboardingStore.setState({
      tour: null,
      stepIndex: 0,
      history: [],
      progress: EMPTY_PROGRESS,
      hydrated: true,
      tourAbandoned: false,
      lastTourEnd: null,
      userSkips: 0,
      lastTickedBy: null,
    })
  );

  const record = (run: () => void) => {
    const sent: OnboardingTourEvent[] = [];
    const unsubscribe = useOnboardingStore.subscribe((next, prev) =>
      sent.push(
        ...tourTelemetryEvents(prev, next, {
          anchorShown: () => true,
          msOnStep: 0,
        })
      )
    );
    run();
    unsubscribe();
    return sent;
  };
  const store = () => useOnboardingStore.getState();
  const passed = { skipIf: () => true };
  const tour = (...steps: TourStep<unknown>[]): Tour<unknown> => ({
    id: "t",
    version: 2,
    steps,
  });

  it("sees a finished tour as completed", () => {
    const sent = record(() => {
      store().startTour(tour(step("a"), step("b")));
      store().advance();
      store().advance();
    });
    expect(sent.at(-1)).toMatchObject({
      event: "tour_ended",
      tour_version: 2,
      outcome: "completed",
      step_id: "b",
    });
    expect(skips(sent)).toEqual([]);
  });

  it("sees a closed tour as closed", () => {
    const sent = record(() => {
      store().startTour(tour(step("a"), step("b")));
      store().endTour(false);
    });
    expect(sent.at(-1)).toMatchObject({ outcome: "closed", step_id: "a" });
  });

  it("sees an abandoned tour as abandoned, after an earlier one finished", () => {
    const sent = record(() => {
      store().startTour(tour(step("a")));
      store().advance();
      store().startTour(tour(step("a"), step("b")));
      store().advance();
      store().abandonTour();
    });
    const ended = sent.filter((e) => e.event === "tour_ended");
    expect(ended).toEqual([
      expect.objectContaining({ outcome: "completed", step_id: "a" }),
      expect.objectContaining({ outcome: "abandoned", step_id: "b" }),
    ]);
  });

  it("reports Skip step as the user's, even when onSkip does the action", () => {
    let done = false;
    const sent = record(() => {
      store().startTour(
        tour(
          step("action", {
            waitFor: () => done,
            onSkip: () => {
              done = true;
            },
          }),
          step("next")
        )
      );
      store().skipStep(0);
    });
    expect(skips(sent)).toEqual(["action:user"]);
    expect(sent.at(-1)).toMatchObject({
      event: "tour_step_viewed",
      step_id: "next",
    });
  });

  it("reports every step one move passes over", () => {
    const sent = record(() => {
      store().startTour(
        tour(step("a"), step("b", passed), step("c", passed), step("d"))
      );
      store().advance();
    });
    expect(skips(sent)).toEqual(["b:tour", "c:tour"]);
    expect(sent.at(-1)).toMatchObject({ step_id: "d" });
  });

  it("reports the first steps a start passes over", () => {
    const sent = record(() =>
      store().startTour(tour(step("a", passed), step("b")))
    );
    expect(names(sent)).toEqual([
      "tour_started",
      "tour_step_skipped",
      "tour_step_viewed",
    ]);
  });

  it("reports a tour that ends inside startTour", () => {
    const sent = record(() =>
      store().startTour(tour(step("a", passed), step("b", passed)))
    );
    expect(names(sent)).toEqual([
      "tour_started",
      "tour_step_skipped",
      "tour_step_skipped",
      "tour_ended",
    ]);
    expect(sent.at(-1)).toMatchObject({
      outcome: "completed",
      step_id: "b",
    });
  });

  it("reports the steps passed over after the last one shown", () => {
    const sent = record(() => {
      store().startTour(tour(step("a"), step("b", passed), step("c", passed)));
      store().advance();
    });
    expect(skips(sent)).toEqual(["b:tour", "c:tour"]);
    expect(sent.at(-1)).toMatchObject({
      event: "tour_ended",
      outcome: "completed",
    });
  });

  it("reports a one-step guide from start to end", () => {
    const sent = record(() => {
      store().startTour(tour(step("only")));
      store().advance(false, 0);
    });
    expect(names(sent)).toEqual([
      "tour_started",
      "tour_step_viewed",
      "tour_ended",
    ]);
    expect(sent.at(-1)).toMatchObject({
      outcome: "completed",
      step_id: "only",
      step_number: 1,
      step_count: 1,
    });
  });

  it("reports a manual tick before the guide that made it ends", () => {
    const sent = record(() => {
      store().startTour(tour(step("first"), step("last")));
      store().advance(false, 0);
      store().markChecklistDone(["dashboard-pdf"], "manual");
      store().endTour(true);
    });
    expect(names(sent)).toEqual([
      "tour_started",
      "tour_step_viewed",
      "tour_step_viewed",
      "checklist_item_done",
      "tour_ended",
    ]);
    expect(sent.at(-2)).toEqual({
      event: "checklist_item_done",
      item_id: "dashboard-pdf",
      ticked_by: "manual",
    });
  });

  it("reports a last step the tour passes over on the way out", () => {
    const sent = record(() => {
      store().startTour(tour(step("a"), step("b")));
      store().advance(false, 0);
      store().advance(true, 1);
    });
    expect(skips(sent)).toEqual(["b:tour"]);
    expect(sent.at(-1)).toMatchObject({ event: "tour_ended" });
  });
});
