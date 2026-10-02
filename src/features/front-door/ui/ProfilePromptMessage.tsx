"use client";

import { memo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { showApiError } from "@/app/hooks/useErrorHandler";
import useAuthStore from "@/app/store/authStore";
import { profileOptionsQuery, profilePrefillQuery } from "../api/queries";
import type { ProfileCardPatch } from "../model/profile-card";
import { ProfilePromptCard } from "./ProfilePromptCard";
import { dismissProfileAsk, saveProfileFromCard } from "./profile-ask";
import { selectProfileUserKey } from "./profile-ask-gate";

/**
 * A `profile-prompt` chat message: the profile card, wired to the account.
 * The message carries no data: showProfilePrompt settles the options and the
 * GFW prefill in the query cache before adding it, so both are read
 * synchronously here and the card mounts once with its final props (it
 * seeds its form from them).
 */
export const ProfilePromptMessage = memo(function ProfilePromptMessage({
  messageId,
}: {
  messageId: string;
}) {
  const userKey = useAuthStore(selectProfileUserKey);
  const { data: options } = useQuery(profileOptionsQuery);
  const { data: prefill } = useQuery(profilePrefillQuery(userKey));
  const [isSaving, setIsSaving] = useState(false);

  if (!options || !prefill) return null;

  const save = async (patch: ProfileCardPatch) => {
    setIsSaving(true);
    try {
      // On success the card's message is removed, unmounting this.
      await saveProfileFromCard(messageId, patch, prefill);
    } catch (err) {
      console.error(err);
      showApiError(err as Error, {
        title: "Couldn't save your details",
        description: "Please try again.",
      });
      setIsSaving(false);
    }
  };

  return (
    <ProfilePromptCard
      options={options}
      suggestion={prefill.suggestion}
      isSaving={isSaving}
      onSave={save}
      onDismiss={() => dismissProfileAsk(messageId)}
    />
  );
});
