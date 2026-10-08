"use client";

import { CompleteProfileMenuItem } from "./CompleteProfileMenuItem";
import { ProfileIncompleteDot } from "./ProfileIncompleteDot";
import { useProfileAskActive } from "./profile-ask-gate";

/** The account button's dot; renders nothing unless an ask is possible. */
export function ProfileReminderDot() {
  return useProfileAskActive() ? <ProfileIncompleteDot /> : null;
}

/** The account menu's "Complete your profile" link to the settings page. */
export function ProfileReminderMenuItem() {
  return useProfileAskActive() ? (
    <CompleteProfileMenuItem href="/settings" />
  ) : null;
}
