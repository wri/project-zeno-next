"use client";

import { useEffect } from "react";

import useOnboardingStore from "../model/onboarding-store";

/**
 * Lets the tour prefill the chat input: when a step sets a draft prompt, the
 * input adopts it once (`apply` receives the text) and the draft is cleared.
 * `apply` must be stable (e.g. a `useState` setter).
 */
export function useOnboardingDraft(apply: (text: string) => void): void {
  const draft = useOnboardingStore((s) => s.draftPrompt);
  useEffect(() => {
    if (draft === null) return;
    const text = useOnboardingStore.getState().consumeDraftPrompt();
    if (text) apply(text);
  }, [draft, apply]);
}
