"use client";

import { useEffect } from "react";

import { trackEvent } from "@/app/lib/track-event";
import type { TourAnchorId } from "@/src/shared/lib/tour-anchors";

import { tourTelemetryEvents } from "../lib/tour-telemetry";
import useOnboardingStore from "../model/onboarding-store";
import { findAnchor } from "./use-target-rect";

const anchorShown = (id: TourAnchorId) => findAnchor(id) !== null;

let subscribed = false;

/**
 * Sends tour telemetry (`tour_*` events, see `tourTelemetryEvents`) once the
 * feature flag is on. It subscribes in an effect, so nothing runs during
 * render (prerender) or with the flag off.
 */
export function useTourTelemetry(enabled: boolean): void {
  useEffect(() => {
    if (enabled) subscribeTourTelemetry();
  }, [enabled]);
}

/**
 * Subscribes once per page and stays subscribed. `OnboardingTour` abandons a
 * running tour as it unmounts (e.g. the window narrows to mobile), and React
 * runs a parent's effect cleanups before its children's: a subscription owned
 * by that component would already be gone and miss `tour_ended`.
 */
function subscribeTourTelemetry(): void {
  if (subscribed) return;
  subscribed = true;
  let enteredAt = Date.now();
  useOnboardingStore.subscribe((next, prev) => {
    const now = Date.now();
    // Runs inside the store update, before React re-renders, so the DOM
    // still shows the step being left.
    const events = tourTelemetryEvents(prev, next, {
      anchorShown,
      msOnStep: now - enteredAt,
    });
    if (next.tour !== prev.tour || next.stepIndex !== prev.stepIndex)
      enteredAt = now;
    for (const event of events) trackEvent(event);
  });
}
