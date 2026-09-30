"use client";

import { Box, type BoxProps } from "@chakra-ui/react";
import useAuthStore from "@/app/store/authStore";
import useProfileNudgeStore from "../model/profile-nudge-store";
import { ProfileNudgeBanner } from "./ProfileNudgeBanner";
import { dismissProfileBanner, openProfileCardFromBanner } from "./profile-ask";

/**
 * Where the later profile banner appears, above the chat input next to the
 * prompt-quota notice. Self-guarding: renders nothing unless the ask policy
 * opened the banner and the profile is still incomplete. Wrapper padding
 * differs between the chat panels, so BoxProps go on the wrapper.
 */
export function ProfileNudgeSlot(props: BoxProps) {
  const open = useProfileNudgeStore((s) => s.bannerOpen);
  const hasProfile = useAuthStore((s) => s.hasProfile);
  if (!open || hasProfile) return null;

  return (
    <Box {...props}>
      <ProfileNudgeBanner
        onOpen={() => void openProfileCardFromBanner()}
        onDismiss={() => dismissProfileBanner()}
      />
    </Box>
  );
}
