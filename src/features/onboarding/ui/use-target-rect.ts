"use client";

import { useEffect, useState } from "react";

import {
  tourAnchorSelector,
  type TourAnchorId,
} from "@/src/shared/lib/tour-anchors";

import { clipToViewport } from "../lib/geometry";
import {
  nextTargetState,
  targetStateForStep,
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
 * re-renders. Scrolls a newly found DOM target into view once per step.
 */
export function useTargetRect(
  target: TourTarget | undefined,
  stepKey: string
): TargetState {
  const [stored, setStored] = useState<MeasuredTargetState>({
    stepKey,
    rect: null,
    found: false,
    missingSince: null,
  });

  useEffect(() => {
    const startedAt = Date.now();
    let el: HTMLElement | null = null;
    let scrolled = false;

    const locate = (): Rect | null => {
      if (!target) return null;
      // Re-query only when the cached element is gone or hidden.
      if (!el || !el.isConnected || !isVisible(el)) el = findAnchor(target.id);
      if (!el) return null;
      if (!scrolled) {
        // Centre, not "nearest": the chat pins the previous prompt over the
        // top edge of its message list, which would hide the target.
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        scrolled = true;
      }
      return clipToViewport(el.getBoundingClientRect(), viewport());
    };

    const measure = () => {
      const rect = locate();
      const now = Date.now();
      setStored((prev) =>
        nextTargetState(prev, {
          stepKey,
          rect,
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
  }, [target, stepKey]);

  return targetStateForStep(stored, stepKey);
}
