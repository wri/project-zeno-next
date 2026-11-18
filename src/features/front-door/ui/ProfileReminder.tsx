"use client";

import type { ReactNode } from "react";
import { CompleteProfileMenuItem } from "./CompleteProfileMenuItem";
import { ProfileIncompleteDot } from "./ProfileIncompleteDot";
import { useProfileAskActive } from "./profile-ask-gate";

/** The account button's dot; renders nothing unless an ask is possible. */
export function ProfileReminderDot() {
  return useProfileAskActive() ? <ProfileIncompleteDot /> : null;
}

/**
 * The account menu's link to the settings page: "Complete your profile" while
 * an ask is possible, else `fallback` (the menu's regular User Profile item).
 */
export function ProfileReminderMenuItem({ fallback }: { fallback: ReactNode }) {
  return useProfileAskActive() ? (
    <CompleteProfileMenuItem href="/dashboard" />
  ) : (
    fallback
  );
}
