"use client";

import { useState } from "react";
import { showApiError } from "@/app/hooks/useErrorHandler";
import type {
  ProfileCardPatch,
  ProfilePromptData,
} from "../model/profile-card";
import { ProfilePromptCard } from "./ProfilePromptCard";
import { dismissProfileAsk, saveProfileFromCard } from "./profile-ask";

export interface ProfilePromptMessageProps {
  messageId: string;
  prompt: ProfilePromptData;
}

/** A `profile-prompt` chat message: the profile card, wired to the account. */
export function ProfilePromptMessage({
  messageId,
  prompt,
}: ProfilePromptMessageProps) {
  const [isSaving, setIsSaving] = useState(false);

  const save = async (patch: ProfileCardPatch) => {
    setIsSaving(true);
    try {
      // On success the card's message is removed, unmounting this.
      await saveProfileFromCard(messageId, prompt, patch);
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
      options={prompt.options}
      suggestion={prompt.suggestion}
      isSaving={isSaving}
      onSave={save}
      onDismiss={() => dismissProfileAsk(messageId)}
    />
  );
}
