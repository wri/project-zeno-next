"use client";

import { useEffect, useState } from "react";

import useMapStore from "@/app/store/mapStore";
import { tourAnchorSelector } from "@/src/shared/lib/tour-anchors";

import { clipToViewport, rectFromPoints, sameRect } from "../lib/geometry";
import type { Rect, TourTarget } from "../model/tour";

const POLL_MS = 80;
/**
 * How long the previous step's spotlight stays put while the next target
 * appears (a panel sliding in, a card rendering), so the veil glides from one
 * target to the next instead of flashing to full cover in between.
 */
const HOLD_PREVIOUS_MS = 600;

export interface TargetState {
  /** Where the spotlight should be: the target, or briefly the previous one. */
  readonly rect: Rect | null;
  /** Whether `rect` is this step's own target. */
  readonly found: boolean;
  /**
   * Since when this step has been without its target: the step's start, or
   * the moment it last saw it. Null while found, or not measured yet.
   */
  readonly missingSince: number | null;
}

/** The state as stored: which step it was measured for. */
export interface MeasuredTargetState extends TargetState {
  readonly stepKey: string;
}

/**
 * What a step sees. Until the hook has measured a new step, the stored state
 * is the previous step's; passing that on would tell the new step its own
 * target had been missing all along, and an optional step would be skipped
 * at once. Only the rect carries over, so the spotlight glides.
 */
export function targetStateForStep(
  stored: MeasuredTargetState,
  stepKey: string
): TargetState {
  return stored.stepKey === stepKey
    ? stored
    : { rect: stored.rect, found: false, missingSince: null };
}

export interface TargetMeasurement {
  readonly stepKey: string;
  /** The target's rect on screen, or null when it isn't there. */
  readonly rect: Rect | null;
  /** The step has a target at all. */
  readonly hasTarget: boolean;
  readonly startedAt: number;
  readonly now: number;
}

/**
 * The state after one measurement. Returns `stored` itself when nothing the
 * spotlight shows has changed, so a missing target costs no re-renders.
 */
export function nextTargetState(
  stored: MeasuredTargetState,
  m: TargetMeasurement
): MeasuredTargetState {
  const sameStep = stored.stepKey === m.stepKey;
  const prev = sameStep
    ? stored
    : { ...targetStateForStep(stored, m.stepKey), stepKey: m.stepKey };
  if (m.rect)
    return sameStep && prev.found && sameRect(prev.rect, m.rect)
      ? stored
      : { stepKey: m.stepKey, rect: m.rect, found: true, missingSince: null };
  const holding = m.hasTarget && m.now - m.startedAt < HOLD_PREVIOUS_MS;
  const missingSince = !m.hasTarget
    ? null
    : prev.found
      ? m.now
      : (prev.missingSince ?? m.startedAt);
  const next: MeasuredTargetState = {
    stepKey: m.stepKey,
    rect: holding ? prev.rect : null,
    found: false,
    missingSince,
  };
  return sameStep &&
    !prev.found &&
    prev.rect === next.rect &&
    prev.missingSince === next.missingSince
    ? stored
    : next;
}

const viewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

const isVisible = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

function findAnchor(id: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(tourAnchorSelector(id));
  // Last match: chat anchors resolve to the newest card in the thread.
  for (let i = all.length - 1; i >= 0; i--)
    if (isVisible(all[i])) return all[i];
  return null;
}

function mapRect(target: Extract<TourTarget, { kind: "map" }>): Rect | null {
  const map = useMapStore.getState().mapRef?.getMap();
  if (!map) return null;
  const box = map.getContainer().getBoundingClientRect();
  const [[west, south], [east, north]] = target.bounds;
  const nw = map.project([west, north]);
  const se = map.project([east, south]);
  const r = rectFromPoints(nw, se);
  return clipToViewport(
    { ...r, x: r.x + box.left, y: r.y + box.top },
    viewport()
  );
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
      if (target.kind === "map") return mapRect(target);
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
