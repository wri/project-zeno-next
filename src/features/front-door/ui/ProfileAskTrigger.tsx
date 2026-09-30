"use client";

import { useEffect } from "react";

import { watchAnswerCompletions } from "./profile-ask";

/**
 * Render-null watcher that asks for the profile after the first answer ever
 * (and later at the policy's other moments). Mounted once in the (chat)
 * layout, behind NEXT_PUBLIC_FRONT_DOOR. Only live answers count: replaying
 * a thread never bumps chatStore.completedAnswers.
 */
export function ProfileAskTrigger() {
  useEffect(() => watchAnswerCompletions(), []);
  return null;
}
