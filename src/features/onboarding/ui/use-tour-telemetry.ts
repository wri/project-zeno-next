"use client";

import { useEffect } from "react";

import { trackEvent } from "@/app/lib/track-event";
import type { TourAnchorId } from "@/src/shared/lib/tour-anchors";

import { tourTelemetryEvents } from "../lib/tour-telemetry";
import useOnboardingStore from "../model/onboarding-store";
import { findAnchor } from "./use-target-rect";

const anchorShown = (id: TourAnchorId) => findAnchor(id) !== null;

/**
 * Sends tour telemetry (`tour_*` events, see `tourTelemetryEvents`) while
 * `enabled`. It subscribes to the onboarding store in an effect, so it does
 * nothing during render (prerender) or with the feature flag off.
 */
export function useTourTelemetry(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let enteredAt = Date.now();
    return useOnboardingStore.subscribe((next, prev) => {
      if (next.tour === prev.tour && next.stepIndex === prev.stepIndex) return;
      const now = Date.now();
      // Runs inside the store update, before React re-renders, so the DOM
      // still shows the step being left.
      const events = tourTelemetryEvents(prev, next, {
        anchorShown,
        msOnStep: now - enteredAt,
      });
      enteredAt = now;
      for (const event of events) trackEvent(event);
    });
  }, [enabled]);
}
