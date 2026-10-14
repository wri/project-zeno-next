"use client";

import { Box, type BoxProps } from "@chakra-ui/react";
import useChatStore from "@/app/store/chatStore";
import useProfileNudgeStore from "../model/profile-nudge-store";
import { ProfileNudgeBanner } from "./ProfileNudgeBanner";
import { dismissProfileBanner, openProfileCardFromBanner } from "./profile-ask";
import { useProfileAskActive } from "./profile-ask-gate";

/**
 * Where the later profile banner appears, above the chat input next to the
 * prompt-quota notice. Self-guarding, like PromptQuotaNotice: renders nothing
 * unless an ask is possible (the front door's one gate) and the ask policy
 * opened the banner. "Add details" waits out a streaming answer, since the
 * card only goes into an idle conversation. Wrapper padding differs between
 * the chat panels, so BoxProps go on the wrapper.
 */
export function ProfileNudgeSlot(props: BoxProps) {
  const active = useProfileAskActive();
  const open = useProfileNudgeStore((s) => s.bannerOpen);
  const answering = useChatStore((s) => s.isLoading);
  if (!active || !open) return null;

  return (
    <Box {...props}>
      <ProfileNudgeBanner
        onOpen={() => void openProfileCardFromBanner()}
        onDismiss={dismissProfileBanner}
        openDisabled={answering}
      />
    </Box>
  );
}
