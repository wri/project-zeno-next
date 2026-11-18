"use client";

import { memo } from "react";
import { ProfileNudgeBanner } from "./ProfileNudgeBanner";
import { dismissProfileAsk, openProfileCardFromBanner } from "./profile-ask";
import { useProfileAskActive } from "./profile-ask-gate";

/**
 * A `profile-nudge` chat message: the later, lighter profile ask, in the
 * conversation after the answer that earned it. Self-guarding: renders
 * nothing once the profile is complete (saved in another tab, say).
 */
export const ProfileNudgeMessage = memo(function ProfileNudgeMessage({
  messageId,
}: {
  messageId: string;
}) {
  const active = useProfileAskActive();
  if (!active) return null;

  return (
    <ProfileNudgeBanner
      onOpen={() => void openProfileCardFromBanner()}
      onDismiss={() => dismissProfileAsk(messageId, "banner")}
    />
  );
});
