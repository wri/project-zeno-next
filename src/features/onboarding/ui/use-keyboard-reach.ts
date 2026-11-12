"use client";

import { useEffect, type RefObject } from "react";

import type { TourAnchorId } from "@/src/shared/lib/tour-anchors";

import {
  focusInstead,
  mayHoldFocus,
  tabFromEdge,
  type FocusMove,
  type FocusStop,
} from "../lib/keyboard-reach";
import { findAnchor } from "./use-target-rect";

/**
 * The React root in index.html: the page the veil dims. Menus, dialogs and
 * toasts open in portals beside it, under body.
 */
const PAGE_ROOT_ID = "root";

/** Elements that can take focus; `isTabStop` keeps the ones Tab stops on. */
const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "iframe",
  "summary",
  "[tabindex]",
  "[contenteditable]:not([contenteditable='false'])",
].join(",");

const isTabStop = (el: HTMLElement): boolean =>
  el.matches(FOCUSABLE) &&
  el.tabIndex >= 0 &&
  !el.matches(":disabled") &&
  !el.closest("[inert]") &&
  el.getClientRects().length > 0 &&
  getComputedStyle(el).visibility !== "hidden";

/** The first or last Tab stop in `root`, itself included, in page order. */
function edgeStop(
  root: HTMLElement | null,
  end: "first" | "last"
): HTMLElement | null {
  if (!root) return null;
  const all = [root, ...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (end === "last") all.reverse();
  return all.find(isTabStop) ?? null;
}

/**
 * Holds the keyboard to the lit target and the popover while `active`, as
 * the veil holds the pointer (see `keyboard-reach` for the rules). A guard on
 * focus, not `inert` on the page: it changes nothing in the app's DOM or in
 * what a screen reader can read, and it judges a menu the target opens in a
 * portal at the moment it takes focus.
 */
export function useKeyboardReach({
  active,
  litTarget,
  popoverRef,
}: {
  active: boolean;
  /** The step's target while the spotlight is on it, else null. */
  litTarget: TourAnchorId | null;
  popoverRef: RefObject<HTMLDivElement | null>;
}): void {
  useEffect(() => {
    if (!active) return;
    const page = document.getElementById(PAGE_ROOT_ID);
    if (!page)
      throw new Error(`The tour found no #${PAGE_ROOT_ID} page to dim.`);

    const lit = () => (litTarget ? findAnchor(litTarget) : null);
    const allowed = (el: Node, target: HTMLElement | null) =>
      mayHoldFocus({
        inPopover: !!popoverRef.current?.contains(el),
        inTarget: !!target?.contains(el),
        inPage: page.contains(el),
      });

    // The body holds focus when nothing does; it is no place to go back to.
    const holder = (el: Element | null, target: HTMLElement | null) =>
      el instanceof HTMLElement && el !== document.body && allowed(el, target)
        ? el
        : null;
    let previous = holder(document.activeElement, lit());
    // Set by a Tab keydown for the focus move it makes in the same task.
    let tabbing: FocusMove | null = null;
    let tabTimer: number | undefined;
    // Focus left for the browser's own controls (Tab past the popover):
    // the next focus in the page is the user's Tab back in.
    let fromOutside = false;

    const resolve = (
      stop: FocusStop,
      target: HTMLElement | null
    ): HTMLElement | null => {
      const popover = popoverRef.current;
      switch (stop) {
        case "previous":
          return previous?.isConnected ? holder(previous, target) : null;
        case "popover":
          return popover;
        case "popover-first":
          return edgeStop(popover, "first");
        case "popover-last":
          return edgeStop(popover, "last");
        case "target-first":
          return edgeStop(target, "first");
        case "target-last":
          return edgeStop(target, "last");
      }
    };

    /** Focus the first stop that takes it (a hidden popover takes none). */
    const focusFirst = (
      stops: readonly FocusStop[],
      target: HTMLElement | null
    ): boolean =>
      stops.some((stop) => {
        const el = resolve(stop, target);
        el?.focus();
        return !!el && document.activeElement === el;
      });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.defaultPrevented) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      tabbing = e.shiftKey ? "shift-tab" : "tab";
      window.clearTimeout(tabTimer);
      tabTimer = window.setTimeout(() => (tabbing = null));
      const from = document.activeElement;
      if (!from) return;
      const target = lit();
      const popover = popoverRef.current;
      const stops = tabFromEdge({
        backward: e.shiftKey,
        atTargetStart: from === edgeStop(target, "first"),
        atTargetEnd: from === edgeStop(target, "last"),
        atPopoverStart: from === popover || from === edgeStop(popover, "first"),
      });
      if (stops && focusFirst(stops, target)) e.preventDefault();
    };

    const onFocusIn = (e: FocusEvent) => {
      const by: FocusMove = tabbing ?? (fromOutside ? "tab" : "other");
      tabbing = null;
      fromOutside = false;
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      const target = lit();
      if (allowed(el, target)) {
        previous = holder(el, target);
        return;
      }
      // Already moved on, e.g. by an open dialog's own focus trap.
      if (document.activeElement !== el) return;
      const beforeTarget =
        !!target &&
        !!(
          el.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      if (!focusFirst(focusInstead({ by, beforeTarget }), target)) el.blur();
    };

    const onWindowBlur = () => {
      fromOutside = true;
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      window.removeEventListener("blur", onWindowBlur);
      window.clearTimeout(tabTimer);
    };
  }, [active, litTarget, popoverRef]);
}
