import { useEffect } from "react";

import useChatStore from "@/app/store/chatStore";

/**
 * Lets another feature (the onboarding tour) prefill the chat input: when a
 * draft prompt is set, the input adopts it once (`apply` receives the text)
 * and the draft is cleared. `apply` must be stable (e.g. a `useState` setter).
 */
export function useDraftPrompt(apply: (text: string) => void): void {
  const draft = useChatStore((s) => s.draftPrompt);
  useEffect(() => {
    if (draft === null) return;
    const text = useChatStore.getState().takeDraftPrompt();
    if (text) apply(text);
  }, [draft, apply]);
}
