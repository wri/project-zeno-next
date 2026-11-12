/**
 * What the keyboard may reach while a tour step shows. The veil stops pointer
 * presses on the dimmed page; these rules do the same for the keyboard, so a
 * dimmed control (the chat input on the View analysis step) can't be used
 * with Tab and Enter either. The lit target, the popover and the layers above
 * the page (a menu or dialog the target opened, a toast) stay in reach, and
 * Tab past the popover's last control still leaves the page for the browser.
 *
 * Pure: the overlay reads the facts off the DOM (`use-keyboard-reach`).
 */

/**
 * Whether the keyboard is held to the lit target and the popover now. Not
 * while the step is docked: the veil is gone and the whole app takes presses
 * and keys again.
 */
export function holdsKeyboard(step: { readonly docked: boolean }): boolean {
  return !step.docked;
}

/** Where an element that takes focus sits. */
export interface FocusPlace {
  /** In the step's popover. */
  readonly inPopover: boolean;
  /** In the step's own target, while it is lit. */
  readonly inTarget: boolean;
  /**
   * In the page the veil dims (the app's root element). False for a layer
   * that opens above the page in a portal, beside the root.
   */
  readonly inPage: boolean;
}

/**
 * Whether an element may hold focus while the keyboard is held. Layers above
 * the page may: the lit target opens its menus, selects and dialogs there,
 * and a dimmed control can't open one (the veil and this rule stop it).
 */
export function mayHoldFocus(place: FocusPlace): boolean {
  return place.inPopover || place.inTarget || !place.inPage;
}

/** Somewhere focus can be sent instead of a dimmed control. */
export type FocusStop =
  /** The element that last held focus on this step, if it still may. */
  | "previous"
  /** The popover itself, as when the step opened. */
  | "popover"
  /** The popover's first control (Close tour) or its last. */
  | "popover-first"
  | "popover-last"
  /** The lit target's first or last Tab stop. */
  | "target-first"
  | "target-last";

/**
 * How focus moved: Tab, Shift+Tab, or another way (the app focused it, a
 * screen reader moved it).
 */
export type FocusMove = "tab" | "shift-tab" | "other";

/**
 * Where focus goes when it lands on a dimmed control: the stops to try, in
 * order (the caller blurs the control when none takes focus, e.g. while the
 * popover is still hidden). Tab moves on in page order, target before
 * popover, as if the dimmed page were not there; Shift+Tab goes back the same
 * way and wraps from the target to the popover. Any other move is undone.
 * `beforeTarget`: the control comes before the lit target in the page
 * (false when nothing is lit).
 */
export function focusInstead(landing: {
  readonly by: FocusMove;
  readonly beforeTarget: boolean;
}): readonly FocusStop[] {
  switch (landing.by) {
    case "tab":
      return landing.beforeTarget
        ? ["target-first", "popover-first"]
        : ["popover-first"];
    case "shift-tab":
      return landing.beforeTarget
        ? ["popover-last"]
        : ["target-last", "popover-last"];
    case "other":
      return ["previous", "popover"];
  }
}

/** Where Tab is pressed from, at the edges of the target and the popover. */
export interface TabEdge {
  readonly backward: boolean;
  /** On the lit target's first Tab stop (both, for a target with one). */
  readonly atTargetStart: boolean;
  /** On the lit target's last Tab stop. */
  readonly atTargetEnd: boolean;
  /** On the popover itself, or on its first control. */
  readonly atPopoverStart: boolean;
}

/**
 * Where a Tab pressed at an edge goes, so that focus never stops on the
 * dimmed control next to it (focusing it would scroll it into view and run
 * its focus handlers). Null: the browser moves focus as usual. Tab on the
 * popover's last control is left to the browser, so the user can leave the
 * page.
 */
export function tabFromEdge(edge: TabEdge): readonly FocusStop[] | null {
  if (!edge.backward) return edge.atTargetEnd ? ["popover-first"] : null;
  if (edge.atTargetStart) return ["popover-last"];
  if (edge.atPopoverStart) return ["target-last", "popover-last"];
  return null;
}
