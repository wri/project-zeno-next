/**
 * Tour vocabulary — pure types shared by the store, the geometry helpers and
 * the React overlay. A tour is an ordered list of steps; each step spotlights
 * one target (or none, for a centred dialog) and either waits for the user to
 * press Next or waits for app state to satisfy `waitFor`.
 */

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

/** Geographic bounds as `[[west, south], [east, north]]`. */
export type LngLatBounds = readonly [
  readonly [number, number],
  readonly [number, number],
];

/**
 * What a step points at.
 *  - `selector`: a `[data-tour="…"]` anchor in the DOM. The LAST match wins, so
 *    chat-card anchors resolve to the newest card in the thread.
 *  - `map`: a geographic box projected onto the map canvas (map features are
 *    not DOM nodes, so they can't be targeted by selector).
 */
export type TourTarget =
  | { readonly kind: "selector"; readonly id: string }
  | { readonly kind: "map"; readonly bounds: LngLatBounds };

export interface TourStep<Body> {
  readonly id: string;
  readonly target?: TourTarget;
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
  /** Footer hint while waiting, e.g. "Click Datasets". */
  readonly hint?: string;
  /** Let the user skip an action step that can't complete (e.g. no nudge). */
  readonly skippable?: boolean;
  /** Skip the step when its target never appears (e.g. a card the agent didn't emit). */
  readonly optional?: boolean;
  /** How long an optional step waits for its target before skipping, ms. */
  readonly targetTimeoutMs?: number;
  /**
   * While true, a missing target means "not here yet" rather than "skip":
   * the step waits for it (e.g. a chat card while the answer streams).
   */
  readonly holdWhile?: () => boolean;
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
  readonly steps: readonly TourStep<Body>[];
  /** Runs when the tour closes; `completed` is false when skipped. */
  readonly onEnd?: (completed: boolean) => void;
}

/** Target the `[data-tour="id"]` anchor. */
export const anchorTarget = (id: string): TourTarget => ({
  kind: "selector",
  id,
});
