"use client";

import { useEffect, useState } from "react";

import {
  tourAnchorSelector,
  type TourAnchorId,
} from "@/src/shared/lib/tour-anchors";

import { clipToAll, clipToViewport } from "../lib/geometry";
import {
  litAnchor,
  nextTargetState,
  targetStateForStep,
  unmeasuredTargetState,
  type LitAnchor,
  type MeasuredTargetState,
  type TargetState,
} from "../lib/target-state";
import type { Rect, TourTarget } from "../model/tour";

const POLL_MS = 80;

const viewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

const isVisible = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

/** The boxes of the elements around `el` that clip what overflows them. */
function scrollClips(el: HTMLElement): Rect[] {
  const clips: Rect[] = [];
  for (let a = el.parentElement; a; a = a.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(a);
    if (overflowX !== "visible" || overflowY !== "visible")
      clips.push(a.getBoundingClientRect());
  }
  return clips;
}

/** The anchor's newest visible element, as the spotlight sees it; null if none. */
export function findAnchor(id: TourAnchorId): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(tourAnchorSelector(id));
  // Last match: chat anchors resolve to the newest card in the thread.
  for (let i = all.length - 1; i >= 0; i--)
    if (isVisible(all[i])) return all[i];
  return null;
}

/**
 * Track where the current step's target is on screen. Lives for the whole
 * tour (`stepKey` marks a new step) so the spotlight can move between steps.
 * Polls (cheaply) instead of observing, because targets move for many reasons
 * we don't own: panels sliding, the chat streaming, the map flying. State only
 * changes when the spotlight should move, so a missing target costs no
 * re-renders. Scrolls each of the step's anchors into view the first time it
 * is lit, unless `scroll` is false (an inner anchor: the target around it is
 * scrolled already, and a second scroll would fight the first). With a
 * `fallback`, lights whichever `litAnchor` picks.
 */
export function useTargetRect(
  target: TourTarget | undefined,
  stepKey: string,
  { scroll = true, fallback }: { scroll?: boolean; fallback?: TourTarget } = {}
): TargetState {
  const [stored, setStored] = useState<MeasuredTargetState>(() =>
    unmeasuredTargetState(stepKey)
  );

  useEffect(() => {
    const startedAt = Date.now();
    const els: Record<LitAnchor, HTMLElement | null> = {
      target: null,
      fallback: null,
    };
    const scrolled = new Set<LitAnchor>(scroll ? [] : ["target", "fallback"]);

    const seek = (which: LitAnchor, anchor: TourTarget | undefined) => {
      if (!anchor) return null;
      // Re-query only when the cached element is gone or hidden.
      const el = els[which];
      if (!el || !el.isConnected || !isVisible(el))
        els[which] = findAnchor(anchor.id);
      return els[which];
    };

    // With a fallback, an anchor is on screen only where the panels around it
    // show it: a chat card scrolled out of the message list keeps a box in
    // the window, over whatever is above the chat. Then the fallback is lit.
    const clipped = !!fallback;

    /** Where the anchor shows, scrolled into view the first time; or null. */
    const shownRect = (
      which: LitAnchor,
      anchor: TourTarget | undefined
    ): Rect | null => {
      const el = seek(which, anchor);
      if (!el) return null;
      if (!scrolled.has(which)) {
        // Centre, not "nearest": the chat pins the previous prompt over the
        // top edge of its message list, which would hide the target.
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        scrolled.add(which);
      }
      const box = el.getBoundingClientRect();
      const shown = clipped ? clipToAll(box, scrollClips(el)) : box;
      return shown && clipToViewport(shown, viewport());
    };

    const locate = (): { rect: Rect | null; onFallback: boolean } => {
      // The target is looked for on every poll; the fallback only without it.
      const targetRect = shownRect("target", target);
      const fallbackRect = targetRect ? null : shownRect("fallback", fallback);
      const lit = litAnchor({ target: !!targetRect, fallback: !!fallbackRect });
      return {
        rect: lit === "target" ? targetRect : fallbackRect,
        onFallback: lit === "fallback",
      };
    };

    const measure = () => {
      const { rect, onFallback } = locate();
      const now = Date.now();
      setStored((prev) =>
        nextTargetState(prev, {
          stepKey,
          rect,
          onFallback,
          hasTarget: !!target,
          startedAt,
          now,
        })
      );
    };

    measure();
    // A step without a target has nothing to track.
    if (!target) return;
    const id = window.setInterval(measure, POLL_MS);
    return () => window.clearInterval(id);
  }, [target, stepKey, scroll, fallback]);

  return targetStateForStep(stored, stepKey);
}
