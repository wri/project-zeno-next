"use client";

import { useState } from "react";
import { Box, Container } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "@/app/lib/router";
import { showApiError } from "@/app/hooks/useErrorHandler";
import { OnboardingHeader } from "@/app/onboarding/OnboardingHeader";
import { OnboardingPageShell } from "@/app/onboarding/OnboardingPageShell";
import { TERMS_VERSION } from "@/app/config/terms";
import { trackEvent } from "@/app/lib/track-event";
import useAuthStore from "@/app/store/authStore";
import { patchProfile } from "../api/profile";
import { profilePrefillQuery } from "../api/queries";
import { pendingPrompt } from "../lib/pending-prompt";
import { WelcomeConsent } from "./WelcomeConsent";
import { selectProfileUserKey } from "./profile-ask-gate";

function WelcomeContent() {
  const search = useSearchParams()?.toString() ?? "";
  const name = useAuthStore((s) => s.userName);
  const userKey = useAuthStore(selectProfileUserKey);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only for analytics (gfw_account); Continue never waits for it.
  const { data: prefill } = useQuery({
    ...profilePrefillQuery(userKey),
    enabled: userKey !== "",
  });

  const accept = async () => {
    setIsSubmitting(true);
    try {
      const { status } = await patchProfile({ terms_version: TERMS_VERSION });
      if (!status?.termsAccepted) {
        throw new Error("The server didn't confirm the accepted terms");
      }
      trackEvent({
        event: "welcome_terms_accepted",
        terms_version: TERMS_VERSION,
        has_prompt: pendingPrompt(search) !== null,
        gfw_account: prefill?.found === true,
      });
      // useAuthGuard sees the accepted terms and continues to /app with this
      // page's query string, so the waiting question runs on arrival.
      useAuthStore.getState().setAuthStatus(status);
    } catch (err) {
      console.error(err);
      showApiError(err as Error, {
        title: "Couldn't save your consent",
        description: "Please try Continue again.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Box minH="100vh" bg="bg" py={24}>
      <Container maxW="3xl">
        <OnboardingHeader headingAs="h2" />
        <WelcomeConsent
          name={name}
          pendingPrompt={pendingPrompt(search)}
          isSubmitting={isSubmitting}
          onContinue={accept}
        />
      </Container>
    </Box>
  );
}

/**
 * /welcome (front door): the one screen between the Resource Watch sign-in
 * and the first answer. Accepting stores `terms_version`; the profile is
 * asked for later, in the chat.
 */
export function WelcomePage() {
  return (
    <OnboardingPageShell>
      <WelcomeContent />
    </OnboardingPageShell>
  );
}
