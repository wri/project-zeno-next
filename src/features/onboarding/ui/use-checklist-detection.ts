"use client";

import { useEffect } from "react";

import useOnboardingStore from "../model/onboarding-store";
import {
  checklistEvidence,
  subscribeToChecklistEvidence,
  type DetectedChecklistItemId,
} from "./app-actions";
import { FIRST_RUN_TOUR_ID } from "../model/tour-entry";

/**
 * One watcher's check: ticks every detectable task whose evidence shows a
 * key it has not seen during the first-run tour. Nothing ticks while that
 * tour runs, and what the tour left on the map never ticks later either: the
 * tour's Kenya steps and its chat answer are not tasks the user chose to do.
 * Keeps the keys seen in the tour for as long as the watcher lives (the page
 * session).
 */
export function createChecklistWatcher(): () => void {
  const fromTour = new Set<string>();
  const key = (id: DetectedChecklistItemId, k: string) => `${id}:${k}`;

  return () => {
    const onboarding = useOnboardingStore.getState();
    const evidence = Object.entries(checklistEvidence()) as [
      DetectedChecklistItemId,
      readonly string[],
    ][];
    if (onboarding.tour?.id === FIRST_RUN_TOUR_ID) {
      for (const [id, keys] of evidence)
        keys.forEach((k) => fromTour.add(key(id, k)));
      return;
    }
    // Before hydration the stored ticks aren't known (and a tick would be
    // overwritten by them).
    if (!onboarding.hydrated) return;
    const done = new Set(onboarding.progress.checklistDone);
    const ticked = evidence
      .filter(
        ([id, keys]) =>
          !done.has(id) && keys.some((k) => !fromTour.has(key(id, k)))
      )
      .map(([id]) => id);
    if (ticked.length > 0) onboarding.markChecklistDone(ticked, "detected");
  };
}

/**
 * Ticks checklist tasks when the app shows the user did them (see
 * `checklistEvidence` and `createChecklistWatcher`). Watches from an effect,
 * so nothing is read or written during render (or prerender).
 */
export function useChecklistDetection(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const check = createChecklistWatcher();
    check();
    const stopApp = subscribeToChecklistEvidence(check);
    const stopOnboarding = useOnboardingStore.subscribe(check);
    return () => {
      stopApp();
      stopOnboarding();
    };
  }, [enabled]);
}
