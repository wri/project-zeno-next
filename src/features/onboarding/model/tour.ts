/**
 * Tour vocabulary — pure types shared by the store, the geometry helpers and
 * the React overlay. A tour is an ordered list of steps; each step spotlights
 * one target (or none, for a centred dialog) and either waits for the user to
 * press Next or waits for app state to satisfy `waitFor`.
 */
import type { TourAnchorId } from "@/src/shared/lib/tour-anchors";

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export type Side = "top" | "right" | "bottom" | "left";

/**
 * What a step points at: a `[data-tour="…"]` anchor in the DOM. The LAST match
 * wins, so chat-card anchors resolve to the newest card in the thread.
 */
export type TourTarget = {
  readonly kind: "selector";
  readonly id: TourAnchorId;
};

export interface TourStep<Body> {
  readonly id: string;
  readonly target?: TourTarget;
  /**
   * The control the copy names, inside a large target (the search box in
   * the Areas panel): the arrow and an inner ring point at it while the
   * whole target stays lit and usable. Only shown with the target.
   */
  readonly focus?: TourTarget;
  /** Preferred popover side; falls back to whichever side fits. */
  readonly placement?: Side;
  /** Spotlight padding around the target, px. Default 6. */
  readonly padding?: number;
  readonly eyebrow?: string;
  readonly title: string;
  readonly body: Body;
  /**
   * Side effects run when the step is entered (open a panel, move the map,
   * prefill the chat), before it renders. Must be idempotent: Back re-enters
   * a step.
   */
  readonly onEnter?: () => void;
  /**
   * Makes this an "action" step: the spotlight hole accepts clicks and the
   * tour advances by itself once this returns true. Polled while active.
   */
  readonly waitFor?: () => boolean;
  /**
   * `waitFor` waits on the app (e.g. the answer), not on the user. Such a
   * step is passed over when the app is already done as it opens.
   */
  readonly waitsOnApp?: boolean;
  /**
   * The status while waiting: what the user does ("Click Datasets") on an
   * action step, what the step waits for on a wait on the app.
   */
  readonly hint?: string;
  /**
   * The status once a wait on the app is over and the step shows Next, e.g.
   * "The answer is ready. Click Next." Default: a plain "Done".
   */
  readonly readyHint?: string;
  /**
   * The step failed (e.g. the answer did not finish). Polled; the status
   * says so instead of "done".
   */
  readonly failedIf?: () => boolean;
  /**
   * The assistant asked the user a question back instead of answering.
   * Polled; it wins over `failedIf`, which also holds for such a turn.
   */
  readonly askedIf?: () => boolean;
  /**
   * The user cannot do what the step asks (e.g. no daily prompts left).
   * Polled; the status wins over every other.
   */
  readonly blockedIf?: () => boolean;
  /**
   * The status line while `blockedIf` holds. Required with it: the wording
   * depends on what the step offers (Skip step on an action step, nothing on
   * a guide).
   */
  readonly blockedNote?: string;
  /**
   * Pass over the step when this holds: as it opens, or later while it is
   * still waiting (e.g. answer steps once the answer has failed).
   */
  readonly skipIf?: () => boolean;
  /**
   * Why the tour passed this step over, said on the next step it shows
   * ("The chart did not load."). Read at the moment it is passed over.
   */
  readonly skipNote?: string | (() => string);
  /**
   * Runs when the user presses Skip step: does what the step asked, so the
   * steps after it still find what they need (e.g. opens the panel).
   */
  readonly onSkip?: () => void;
  /** Skip the step when its target never appears (e.g. a card the agent didn't emit). */
  readonly optional?: boolean;
  /**
   * How long to wait after `waitFor` passes before moving on, ms, so the user
   * sees what their action did. Default `DEFAULT_ADVANCE_DELAY_MS`.
   */
  readonly advanceDelayMs?: number;
  /**
   * Default true: move on once `waitFor` passes. False shows Next instead, for
   * steps the user should read after the wait (e.g. the finished answer).
   */
  readonly autoAdvance?: boolean;
  readonly noBack?: boolean;
  readonly ctaLabel?: string;
  /** Secondary footer button; `onClick` receives the tour's `end`. */
  readonly secondary?: {
    readonly label: string;
    readonly onClick: (end: (completed: boolean) => void) => void;
  };
}

export interface Tour<Body> {
  readonly id: string;
  /**
   * Content version, sent with tour telemetry so funnels from different
   * versions of a tour aren't mixed. Raise it when the steps change.
   */
  readonly version: number;
  readonly steps: readonly TourStep<Body>[];
  /** Runs when the tour closes; `completed` is false when skipped. */
  readonly onEnd?: (completed: boolean) => void;
}

/** Target the `[data-tour="id"]` anchor. */
export const anchorTarget = (id: TourAnchorId): TourTarget => ({
  kind: "selector",
  id,
});
