"use client";

import { useEffect, useRef } from "react";

import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "@/src/shared/lib/router";

import { readProgress, writeProgress } from "../lib/progress-storage";
import useOnboardingStore, {
  selectTourActive,
} from "../model/onboarding-store";
import { closeExplorationPanels } from "./app-actions";
import {
  ONBOARDING_FEATURE_FLAG,
  START_TOUR_PARAM,
  routeChangeEndsTour,
  shouldStartTour,
} from "./tour-entry";
import { TourOverlay } from "./TourOverlay";
import { createFirstRunTour } from "./tours/first-run-tour";
import { useChecklistDetection } from "./use-checklist-detection";
import { useTourTelemetry } from "./use-tour-telemetry";

/** Let the map settle (default layers, first paint) before dimming it. */
const START_DELAY_MS = 800;

/**
 * The guided tour: loads and saves onboarding progress, starts the first-run
 * tour for new users or when the URL carries `?tour` ("Take the tour"),
 * renders whichever tour is running, and ticks checklist tasks the user does
 * (`useChecklistDetection`). When it starts: `shouldStartTour`.
 * Mount once, desktop only.
 */
export function OnboardingTour() {
  const enabled = useFeatureFlag(ONBOARDING_FEATURE_FLAG);
  useTourTelemetry(enabled);
  useChecklistDetection(enabled);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const startRequested = searchParams.has(START_TOUR_PARAM);
  const mapReady = useMapStore((s) => s.mapRef !== null);
  const hydrated = useOnboardingStore((s) => s.hydrated);
  const firstVisit = useOnboardingStore((s) => s.progress.tourOutcome === null);
  const tourRunning = useOnboardingStore(selectTourActive);
  const tourAbandoned = useOnboardingStore((s) => s.tourAbandoned);
  const conversationStarted = useChatStore((s) => s.currentThreadId !== null);

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
    const start = shouldStartTour({
      pathname,
      params: searchParams,
      firstVisit,
      conversationStarted,
      tourAbandoned,
    });
    if (!start) return;

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
    conversationStarted,
    tourAbandoned,
    searchParams,
    router,
  ]);

  return enabled ? (
    <>
      <EndTourWhenLeft />
      <TourOverlay />
    </>
  ) : null;
}

/** Stop the running tour (no outcome) and close the panels it opened. */
function abandonRunningTour(): void {
  const store = useOnboardingStore.getState();
  if (!store.tour) return;
  store.abandonTour();
  closeExplorationPanels();
}

/**
 * Ends a running tour, with no outcome, once it can't be followed: its
 * overlay goes away (the window narrows to the mobile layout, the user leaves
 * the map) or the page changes under it (see `routeChangeEndsTour`).
 * Otherwise it stays "running" and keeps holding back the profile ask.
 */
function EndTourWhenLeft() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const from = previousPathname.current;
    previousPathname.current = pathname;
    const threadId = useChatStore.getState().currentThreadId;
    if (routeChangeEndsTour(from, pathname, threadId)) abandonRunningTour();
  }, [pathname]);

  useEffect(() => abandonRunningTour, []);

  return null;
}
