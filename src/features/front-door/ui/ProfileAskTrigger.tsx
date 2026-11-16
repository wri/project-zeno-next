"use client";

import { useEffect } from "react";

import { prefetchProfilePrompt, watchAnswerCompletions } from "./profile-ask";
import { useProfileAskActive } from "./profile-ask-gate";

/**
 * Render-null watcher that asks for the profile after the first answer ever
 * (and later at the policy's other moments). Mounted once in the (chat)
 * layout; it only watches while an ask is possible (signed in, no
 * profile). Only live answers count:
 * replaying a thread never bumps chatStore.completedAnswers.
 *
 * `paused` (e.g. while a guided tour runs) stops watching: answers meanwhile
 * are neither counted nor asked at, so nothing is marked shown and the ask
 * comes at the first answer after it resumes.
 */
export function ProfileAskTrigger({ paused = false }: { paused?: boolean }) {
  const watching = useProfileAskActive() && !paused;
  useEffect(() => {
    if (!watching) return;
    // Ready before the first answer lands, so the card appears with it.
    prefetchProfilePrompt();
    return watchAnswerCompletions();
  }, [watching]);
  return null;
}
