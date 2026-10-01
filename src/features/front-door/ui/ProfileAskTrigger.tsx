"use client";

import { useEffect } from "react";

import { watchAnswerCompletions } from "./profile-ask";
import { useProfileAskActive } from "./profile-ask-gate";

/**
 * Render-null watcher that asks for the profile after the first answer ever
 * (and later at the policy's other moments). Mounted once in the (chat)
 * layout; it only watches while an ask is possible (the front door's one
 * gate), so with the flag off it does nothing. Only live answers count:
 * replaying a thread never bumps chatStore.completedAnswers.
 */
export function ProfileAskTrigger() {
  const active = useProfileAskActive();
  useEffect(() => {
    if (!active) return;
    return watchAnswerCompletions();
  }, [active]);
  return null;
}
