"use client";

import { useEffect } from "react";

import { usePathname, useRouter, useSearchParams } from "@/app/lib/router";
import useMapStore from "@/app/store/mapStore";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags";

import { readProgress, writeProgress } from "../lib/progress-storage";
import useOnboardingStore from "../model/onboarding-store";
import { ONBOARDING_FEATURE_FLAG, START_TOUR_PARAM } from "./tour-entry";
import { TourOverlay } from "./TourOverlay";
import { createFirstRunTour } from "./tours/first-run-tour";

/** Let the map settle (default layers, first paint) before dimming it. */
const START_DELAY_MS = 800;

const NEW_CONVERSATION_PATH = "/app";

/**
 * The guided tour: loads and saves onboarding progress, starts the first-run
 * tour for new users or when the URL carries `?tour` ("Take the tour"), and
 * renders whichever tour is running. Only starts on a fresh conversation,
 * where the tour's map and chat steps make sense. Mount once, desktop only.
 */
export function OnboardingTour() {
  const enabled = useFeatureFlag(ONBOARDING_FEATURE_FLAG);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const startRequested = searchParams.has(START_TOUR_PARAM);
  const mapReady = useMapStore((s) => s.mapRef !== null);
  const hydrated = useOnboardingStore((s) => s.hydrated);
  const firstVisit = useOnboardingStore((s) => s.progress.tourOutcome === null);
  const tourRunning = useOnboardingStore((s) => s.tour !== null);

  // Load once, then persist every change.
  useEffect(() => {
    if (!enabled) return;
    const store = useOnboardingStore.getState();
    if (!store.hydrated) store.hydrate(readProgress(window.localStorage));
    return useOnboardingStore.subscribe((state, prev) => {
      if (state.progress !== prev.progress)
        writeProgress(window.localStorage, state.progress);
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !hydrated || !mapReady || tourRunning) return;
    if (pathname !== NEW_CONVERSATION_PATH) return;
    if (!startRequested && !firstVisit) return;

    const timer = window.setTimeout(() => {
      useOnboardingStore.getState().startTour(createFirstRunTour());
      // Drop the param so finishing the tour doesn't start it again.
      if (startRequested) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete(START_TOUR_PARAM);
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
      }
    }, START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [
    enabled,
    hydrated,
    mapReady,
    tourRunning,
    pathname,
    startRequested,
    firstVisit,
    searchParams,
    router,
  ]);

  return enabled ? <TourOverlay /> : null;
}
